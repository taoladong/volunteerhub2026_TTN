// VietQR helpers — chỉ sinh ẢNH QR (img.vietqr.io), KHÔNG xử lý thanh toán.
// Người ủng hộ quét QR bằng app ngân hàng của họ và chuyển khoản NGOÀI hệ thống.

// Danh sách ngân hàng VN phổ biến (BIN theo chuẩn Napas/VietQR)
export const VN_BANKS = [
  { bin: '970422', code: 'MB', name: 'MB Bank (Quân đội)' },
  { bin: '970436', code: 'VCB', name: 'Vietcombank' },
  { bin: '970407', code: 'TCB', name: 'Techcombank' },
  { bin: '970415', code: 'ICB', name: 'VietinBank' },
  { bin: '970418', code: 'BIDV', name: 'BIDV' },
  { bin: '970405', code: 'VBA', name: 'Agribank' },
  { bin: '970432', code: 'VPB', name: 'VPBank' },
  { bin: '970423', code: 'TPB', name: 'TPBank' },
  { bin: '970403', code: 'STB', name: 'Sacombank' },
  { bin: '970416', code: 'ACB', name: 'ACB' },
  { bin: '970448', code: 'OCB', name: 'OCB' },
  { bin: '970426', code: 'MSB', name: 'MSB' },
  { bin: '970454', code: 'VCCB', name: 'Bản Việt (BVBank)' },
  { bin: '970437', code: 'HDB', name: 'HDBank' },
  { bin: '970443', code: 'SHB', name: 'SHB' },
  { bin: '970441', code: 'VIB', name: 'VIB' },
  { bin: '970431', code: 'EIB', name: 'Eximbank' },
  { bin: '970400', code: 'SGICB', name: 'SaigonBank' },
  { bin: '970429', code: 'SCB', name: 'SCB' },
  { bin: '546034', code: 'CAKE', name: 'CAKE by VPBank' },
  { bin: '963388', code: 'TIMO', name: 'Timo' },
];

export function getBankByBin(bin) {
  return VN_BANKS.find((b) => b.bin === String(bin || '').trim());
}

/**
 * Sinh URL ảnh VietQR (compact2 = có logo + STK + footer như app ngân hàng).
 * @param {object} p
 * @param {string} p.bin           Mã BIN ngân hàng (vd 970422)
 * @param {string} p.accountNo     Số tài khoản
 * @param {string} [p.accountName] Tên chủ TK (hiển thị)
 * @param {number} [p.amount]      Số tiền (có → QR động điền sẵn)
 * @param {string} [p.addInfo]     Nội dung chuyển khoản (mã đối soát)
 * @param {string} [p.template]    compact2 | compact | qr_only | print
 * @returns {string|null}
 */
export function buildVietQrUrl({ bin, accountNo, accountName, amount, addInfo, template = 'compact2' }) {
  if (!bin || !accountNo) return null;
  const base = `https://img.vietqr.io/image/${encodeURIComponent(bin)}-${encodeURIComponent(accountNo)}-${template}.png`;
  const params = new URLSearchParams();
  if (amount && Number(amount) > 0) params.set('amount', String(Math.round(Number(amount))));
  if (addInfo) params.set('addInfo', addInfo);
  if (accountName) params.set('accountName', accountName);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Mã đối soát gợi ý cho nội dung chuyển khoản */
export function buildDonationMemo(campaignId, suffix) {
  const s = (suffix == null || suffix === '') ? '' : ` ${suffix}`;
  return `UH ${campaignId}${s}`;
}
