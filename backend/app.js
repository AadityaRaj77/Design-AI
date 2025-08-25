import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { z } from 'zod';
import { ChatGroq } from '@langchain/groq';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';

const app = express();
app.use(cors());
app.use(express.json());

// file uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// Define structured schema for design review
const reviewSchema = z.object({
    summary: z.string().describe("One paragraph high-level critique"),
    scores: z.object({
        visual_hierarchy: z.number().min(0).max(10),
        typography: z.number().min(0).max(10),
        color: z.number().min(0).max(10),
        accessibility: z.number().min(0).max(10),
        usability: z.number().min(0).max(10),
        emotional_tone: z.string().describe("Single word or short phrase"),
    }),
    product_value: z.string().describe("How design supports business/product value"),
    priority_fixes: z.array(z.string()).min(3).max(7),
    suggestions: z.array(z.string()).min(3).max(10),
});

// Parser (adds format instructions)
const parser = StructuredOutputParser.fromZodSchema(reviewSchema);

// Prompt template (variables: prompt, fileName, fileType, format_instructions)
const template = `
You are a senior Product/UX design critic.
Task: Review a UI/graphic design and return ONLY structured JSON.

Design context:
- File: "{fileName}" ({fileType})
- User brief: "{prompt}"

Rules:
- Be concise but actionable.
- Consider visual hierarchy, typography, color, accessibility, usability.
- Include emotional/brand feel and product value alignment.
- Respond in the exact JSON format described below. No extra text.

{format_instructions}
`;

// Chain pieces
const llm = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    maxTokens: 1200,
    apiKey: process.env.GROQ_API_KEY,
});

const promptTpl = new PromptTemplate({
    template,
    inputVariables: ["prompt", "fileName", "fileType"],
    partialVariables: {
        format_instructions: parser.getFormatInstructions(),
    },
});

// API route
app.post('/review', upload.single('file'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const file = req.file;

        const fileName = file?.originalname || "no-file";
        const fileType = file?.mimetype || "unknown";
        const finalPrompt = await promptTpl.format({ prompt, fileName, fileType });
        const raw = await llm.invoke([{ role: "user", content: finalPrompt }]);
        const text = raw?.content?.[0]?.text ?? (raw?.content ?? "");
        const parsed = await parser.parse(text);

        res.json({ ok: true, result: parsed });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
