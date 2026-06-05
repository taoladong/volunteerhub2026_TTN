using AuthService.Contracts;
using AuthService.Data;
using AuthService.Entities;
using AuthService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Controllers;

[ApiController]
[Authorize]
[Route("api/skills")]
public class SkillsController : ControllerBase
{
    private static readonly (string Name, string Description)[] DefaultSkills =
    {
        ("Sơ cứu", "Hỗ trợ sơ cấp cứu cơ bản tại sự kiện."),
        ("Điều phối sự kiện", "Sắp xếp đội hình, phân luồng và hỗ trợ ban tổ chức."),
        ("Truyền thông", "Chụp ảnh, viết bài và truyền thông mạng xã hội."),
        ("Dạy học", "Hỗ trợ lớp học, kèm học sinh hoặc đào tạo cộng đồng."),
        ("Công nghệ thông tin", "Hỗ trợ kỹ thuật, dữ liệu và công cụ số."),
        ("Gây quỹ", "Hỗ trợ vận động tài trợ và quản lý hoạt động quyên góp.")
    };

    private readonly AuthDbContext _dbContext;

    public SkillsController(AuthDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<SkillResponse>>> GetAll(CancellationToken cancellationToken)
    {
        await EnsureDefaultSkillsAsync(cancellationToken);

        var skills = await _dbContext.Skills
            .OrderBy(skill => skill.Name)
            .Select(skill => new SkillResponse(skill.Id, skill.Name, skill.Description))
            .ToArrayAsync(cancellationToken);

        return Ok(skills);
    }

    [HttpPost]
    public async Task<ActionResult<SkillResponse>> Create(SkillRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Skill name is required." });
        }

        var name = request.Name.Trim();
        var existing = await _dbContext.Skills.FirstOrDefaultAsync(skill => skill.Name == name, cancellationToken);
        if (existing is not null)
        {
            return Ok(new SkillResponse(existing.Id, existing.Name, existing.Description));
        }

        var skill = new Skill
        {
            Name = name,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim()
        };

        _dbContext.Skills.Add(skill);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new SkillResponse(skill.Id, skill.Name, skill.Description));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<SkillResponse>> Update(int id, SkillRequest request, CancellationToken cancellationToken)
    {
        var skill = await _dbContext.Skills.FirstOrDefaultAsync(entity => entity.Id == id, cancellationToken);
        if (skill is null)
        {
            return NotFound(new { message = "Skill was not found." });
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Skill name is required." });
        }

        skill.Name = request.Name.Trim();
        skill.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new SkillResponse(skill.Id, skill.Name, skill.Description));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var skill = await _dbContext.Skills.FirstOrDefaultAsync(entity => entity.Id == id, cancellationToken);
        if (skill is null)
        {
            return NotFound(new { message = "Skill was not found." });
        }

        _dbContext.Skills.Remove(skill);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task EnsureDefaultSkillsAsync(CancellationToken cancellationToken)
    {
        if (await _dbContext.Skills.AnyAsync(cancellationToken))
        {
            return;
        }

        foreach (var (name, description) in DefaultSkills)
        {
            _dbContext.Skills.Add(new Skill
            {
                Name = name,
                Description = description
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}

public record SkillRequest(string? Name, string? Description);
public record SkillResponse(int Id, string Name, string? Description);
