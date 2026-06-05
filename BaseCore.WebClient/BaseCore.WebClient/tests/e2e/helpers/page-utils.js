// Utility helpers cho Playwright page-level checks.

const MOJIBAKE_PATTERNS = [
  /Ã[¢âáàã]/, // Ã¢, Ã©, Ã , Ã¡ (UTF-8 đọc thành Latin-1)
  /Ã{2,}/,
  /á»[a-zA-Z¿]/, // á»±, á»§, á»‡ ...
  /áº[a-zA-Z¿]/,
  /Ä‘/, // Ä‘ thay vì đ
  /â‚¬|â„¢|â€™|â€œ|â€/, // các sequence từ smart quotes/euro/tm
  /Â[ ¥§©®°±¿]/, // Â , Â¥, Â§ ...
  /Ð[a-zA-Z]/, // không phải Cyrillic mà là mojibake
];

/**
 * Kiểm tra text trong DOM xem có mojibake (UTF-8 bị decode sai) không.
 * Trả về { hasMojibake: bool, samples: string[] } với tối đa 5 đoạn dính lỗi.
 */
export async function detectMojibake(page) {
  const allText = await page.evaluate(() => {
    return document.body ? document.body.innerText : '';
  });

  const samples = [];
  if (!allText) return { hasMojibake: false, samples };

  // Split thành dòng để dễ xác định ngữ cảnh.
  const lines = allText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const re of MOJIBAKE_PATTERNS) {
      if (re.test(trimmed)) {
        if (!samples.includes(trimmed)) {
          samples.push(trimmed.slice(0, 200));
        }
        break;
      }
    }
    if (samples.length >= 5) break;
  }

  return { hasMojibake: samples.length > 0, samples };
}

/**
 * Bắt console errors trong suốt page lifecycle.
 * Dùng:
 *   const errors = collectConsoleErrors(page);
 *   ... navigate ...
 *   expect(errors).toEqual([]);
 */
export function collectConsoleErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });
  return errors;
}

/**
 * Lọc bỏ các console error vô hại (network 401 cho profile khi anon, lazy chunk warning, etc.)
 */
export function filterIgnorableErrors(errors) {
  const ignorable = [
    /Failed to load resource.*401/i,
    /Failed to load resource.*404/i,
    /Failed to load resource.*the server responded.*43[0-9]/i,
    /favicon\.ico/i,
    /chrome-extension/i,
    // SignalR khi service offline
    /WebSocket connection.*failed/i,
    /SignalR/i,
    /Hub connection/i,
  ];
  return errors.filter((e) => !ignorable.some((re) => re.test(e)));
}
