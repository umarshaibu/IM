namespace IM.Core.Entities;

public class LoginToken : BaseEntity
{
    public Guid NominalRollId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public int AttemptCount { get; set; }

    // Navigation
    public NominalRoll NominalRoll { get; set; } = null!;
}
