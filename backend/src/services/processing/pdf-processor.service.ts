import pdf from "pdf-parse";
import fs from "fs/promises";

export const pdfProcessorService = {
  async extractText(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      
      return data.text;
    } catch (error: any) {
      console.error("PDF processing error:", error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  },

  async extractMetadata(filePath: string) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      
      return {
        pages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        version: data.version,
      };
    } catch (error: any) {
      console.error("PDF metadata extraction error:", error);
      throw new Error(`Failed to extract PDF metadata: ${error.message}`);
    }
  },
};
