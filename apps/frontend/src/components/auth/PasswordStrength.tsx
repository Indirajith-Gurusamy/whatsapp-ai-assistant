import { useMemo } from "react";

interface PasswordStrengthProps {
    password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
    const strength = useMemo(() => {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
        };

        if (checks.length) score++;
        if (checks.uppercase) score++;
        if (checks.lowercase) score++;
        if (checks.number) score++;
        if (checks.special) score++;

        let label = "Weak";
        let color = "bg-red-500";

        if (score === 5) {
            label = "Strong";
            color = "bg-green-500";
        } else if (score >= 3) {
            label = "Medium";
            color = "bg-yellow-500";
        }

        const isValid = score === 5;

        return { score, label, color, checks, isValid };
    }, [password]);

    if (!password) return null;

    return (
        <div className="mt-2 space-y-2">
            {/* Strength Bar */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                    />
                </div>
                <span className={`text-xs font-semibold ${strength.color.replace('bg-', 'text-')}`}>
                    {strength.label}
                </span>
            </div>

            {/* Validation Message */}
            {!strength.isValid && (
                <p className="text-[10px] text-gray-500 leading-tight">
                    Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.
                </p>
            )}
        </div>
    );
}
