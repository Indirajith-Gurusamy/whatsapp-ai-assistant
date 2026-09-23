export type AIProviderType = "groq" | "gemini";

export interface AIProvider {
    id: string;
    name: string;
    provider: AIProviderType;
    active: boolean;
    config: {
        api_key: string;
        model: string;
    };
}

export const PROVIDER_LABELS: Record<AIProviderType, string> = {
    groq: "Groq",
    gemini: "Gemini",
};

export const GROQ_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.6-27b",
];

export const GEMINI_MODELS = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
];

/** @deprecated Saved configs may still use openai until migrated */
export type LegacyAIProviderType = AIProviderType | "openai";

/** Map retired Groq model IDs to supported replacements. */
const DEPRECATED_GROQ_MODELS: Record<string, string> = {
    "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
    "llama-3.1-8b-instant": "openai/gpt-oss-20b",
    "meta-llama/llama-4-scout-17b-16e-instruct": "openai/gpt-oss-120b",
    "qwen/qwen3-32b": "openai/gpt-oss-120b",
};

/** Resolve a provider's model, replacing retired/deprecated IDs with current defaults. */
export function normalizeModel(provider: AIProviderType, model: string | undefined): string {
    const value = (model || "").trim();
    if (!value) return provider === "groq" ? defaultModelForProvider("groq") : defaultModelForProvider("gemini");
    if (provider === "groq") {
        const migrated = DEPRECATED_GROQ_MODELS[value];
        if (migrated) return migrated;
    }
    if (provider === "gemini" && value.startsWith("gpt")) return defaultModelForProvider("gemini");
    return value;
}

export function normalizeProviderType(provider: string): AIProviderType {
    if (provider === "openai") return "gemini";
    if (provider === "groq" || provider === "gemini") return provider;
    return "groq";
}

export function newProviderId(): string {
    return `ai-${Date.now().toString(36)}`;
}

export function defaultModelForProvider(provider: AIProviderType): string {
    return provider === "groq" ? GROQ_MODELS[0] : GEMINI_MODELS[0];
}

/** Pick a provider type that differs from the active one when possible. */
export function defaultProviderTypeForNew(existing: AIProvider[]): AIProviderType {
    const normalized = existing.map((p) => ({
        ...p,
        provider: normalizeProviderType(p.provider as string),
    }));
    const active = normalized.find((p) => p.active);
    if (active?.provider === "groq") return "gemini";
    if (active?.provider === "gemini") return "groq";
    const hasGroq = normalized.some((p) => p.provider === "groq");
    const hasGemini = normalized.some((p) => p.provider === "gemini");
    if (hasGroq && !hasGemini) return "gemini";
    if (hasGemini && !hasGroq) return "groq";
    return "gemini";
}

export function isProviderDraft(provider: AIProvider): boolean {
    return !provider.config.api_key.trim();
}

export function createNewProvider(existing: AIProvider[]): AIProvider {
    const providerType = defaultProviderTypeForNew(existing);
    const hasActive = existing.some((p) => p.active);
    return {
        id: newProviderId(),
        name: `New ${PROVIDER_LABELS[providerType]}`,
        provider: providerType,
        active: !hasActive,
        config: {
            api_key: "",
            model: defaultModelForProvider(providerType),
        },
    };
}
