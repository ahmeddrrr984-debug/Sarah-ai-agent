type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type NVIDIAResponse = {
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
}

export class NVIDIAClient {
  private apiKey: string
  private model: string

  constructor() {
    this.apiKey = process.env.NVIDIA_API_KEY as string
    this.model = process.env.NVIDIA_MODEL as string

    if (!this.apiKey) {
      throw new Error("NVIDIA_API_KEY environment variable is not set")
    }

    if (!this.model) {
      throw new Error("NVIDIA_MODEL environment variable is not set")
    }
  }

  async getReply(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          chat_template_kwargs: {
            reasoning_effort: "low",
            clear_thinking: true
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`NVIDIA API error: ${response.status} - ${errorText}`)
    }

    const data = (await response.json()) as NVIDIAResponse

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No choices returned from NVIDIA API")
    }

    console.log("FINISH REASON:", data.choices[0].finish_reason)

    return data.choices[0].message.content
  }
}

type GeminiUsageMetadata = {
  promptTokenCount?: number
  candidatesTokenCount?: number
  totalTokenCount?: number
  thoughtsTokenCount?: number
}

export class GeminiClient {
  private apiKey: string
  private model: string

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY as string
    this.model = (process.env.GEMINI_MODEL as string) || "gemini-3.5-flash-lite"

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set")
    }
  }

  async getReply(messages: ChatMessage[]): Promise<string> {
    const systemParts = messages
      .filter(m => m.role === "system")
      .map(m => m.content)
      .join("\n\n")

    const contents = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }))

    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: systemParts }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        thinkingConfig: { thinkingLevel: "low" }
      }
    })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey
        },
        body
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText.slice(0, 300)}`)
    }

    let full = ""
    let usage: GeminiUsageMetadata | null = null
    let finishReason: string | null = null
    const decoder = new TextDecoder()
    let buffer = ""

    for await (const chunk of response.body!) {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data: ")) continue
        const payload = trimmed.slice(6)
        if (payload === "[DONE]") continue
        try {
          const parsed = JSON.parse(payload)
          if (parsed.usageMetadata) {
            usage = parsed.usageMetadata as GeminiUsageMetadata
          }
          const candidates = parsed.candidates || []
          if (candidates.length > 0) {
            const parts = (candidates[0].content && candidates[0].content.parts) || []
            for (const p of parts) {
              if (p.text) full += p.text
            }
            if (candidates[0].finishReason) {
              finishReason = candidates[0].finishReason
            }
          }
        } catch {
          // ignore partial-line parse errors
        }
      }
    }

    console.log("FINISH REASON:", finishReason)
    if (usage) {
      console.log(
        `TOKENS: prompt=${usage.promptTokenCount ?? "?"} output=${usage.candidatesTokenCount ?? "?"} thoughts=${usage.thoughtsTokenCount ?? "?"} total=${usage.totalTokenCount ?? "?"}`
      )
    }

    if (!full) {
      throw new Error("No content returned from Gemini API")
    }

    return full
  }
}
