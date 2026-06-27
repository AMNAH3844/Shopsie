export function passwordResetEmailTemplate(resetUrl) {
  return {
    subject: "Reset Your Password",
    text: [
      "Reset Your Password",
      "",
      "We received a request to reset your Shopsie account password.",
      `Open this secure link to choose a new password: ${resetUrl}`,
      "",
      "This link expires in 1 hour and can only be used once.",
      "If you did not request this reset, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h1 style="color: #111827;">Reset Your Password</h1>
        <p>We received a request to reset your Shopsie account password.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #FFD60A; color: #0a0c47; padding: 12px 18px; border-radius: 8px; font-weight: 700; text-decoration: none;">
            Reset Your Password
          </a>
        </p>
        <p>This secure link expires in 1 hour and can only be used once.</p>
        <p>If you did not request this reset, you can safely ignore this email.</p>
      </div>
    `,
  };
}
