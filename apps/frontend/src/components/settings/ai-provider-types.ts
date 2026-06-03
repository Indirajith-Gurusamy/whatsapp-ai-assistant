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
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama-3.2-90b-vision-preview",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
];

export const GEMINI_MODELS = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
];

/** @deprecated Saved configs may still use openai until migrated */
export type LegacyAIProviderType = AIProviderType | "openai";

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
