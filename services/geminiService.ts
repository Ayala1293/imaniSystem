
import { GoogleGenAI } from "@google/genai";
import { Product, Order, Client } from "../types";

// This is a client-side call for demo purposes. 
// In production, proxy this through your backend to protect the API key.
const AI_API_KEY = process.env.API_KEY || ''; 

let ai: GoogleGenAI | null = null;

if (AI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: AI_API_KEY });
}

export const generateProductDescription = async (name: string, attributes: string): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API Key missing");
    return "API Key missing. Please configure the environment.";
  }

  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      Write a compelling, sales-oriented product description (max 50 words) for an online shop.
      Product Name: ${name}
      Key Features/Attributes: ${attributes}
      Tone: Professional and persuasive.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text ? response.text.trim() : "";
  } catch (error) {
    console.error("Error generating description:", error);
    return "Failed to generate description via AI.";
  }
};

export const analyzeSalesTrends = async (ordersData: string): Promise<string> => {
    if (!ai) return "AI not configured.";

    try {
        const model = "gemini-2.5-flash";
        const prompt = `
            Analyze this summarized sales data and give 3 bullet points on performance and advice for next month's imports.
            Data: ${ordersData}
        `;
        
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        return response.text || "No analysis generated.";
    } catch (e) {
        return "Analysis unavailable.";
    }
}

export const generateInvoiceMessage = async (order: Order, client: Client, products: Product[], type: 'FOB' | 'FREIGHT', deadlineDateStr: string): Promise<string> => {
  if (!ai) return "AI not configured. Please set API Key.";

  const itemsList = order.items.map((item, index) => {
    const product = products.find(p => p.id === item.productId);
    const cost = type === 'FOB' ? item.fobTotal : item.freightTotal;
    
    // Format attributes like "Size 40" or "Black"
    const attrs = item.selectedAttributes.map(a => a.value).join('-');
    const attrString = attrs ? `-${attrs}` : '';
    
    // Only include if cost > 0 (relevant for Freight invoices where some items might not have arrived)
    if (cost === 0) return null;

    return `${index + 1}.${product?.name}${attrString}-Ksh.${cost}`;
  }).filter(Boolean).join('\n');

  const total = order.items.reduce((sum, item) => sum + (type === 'FOB' ? item.fobTotal : item.freightTotal), 0);
  const accountNo = client.phone.replace('+', ''); // Use phone as account no
  
  // Parse the ISO deadline string to a friendly format
  const deadlineFriendly = new Date(deadlineDateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }); // e.g., 9th of August

  const prompt = `
    You are a shop assistant creating a WhatsApp invoice message.
    
    Generate a message EXACTLY following this format (do not add intro text outside the message):

    Good afternoon ${client.name.split(' ')[0]}. Kindly confirm your order below.

    ${itemsList}

    Total Ksh.${total}

    *Payment details*
    Paybill No.542542
    Account.No.${accountNo}

    Payment deadline is on the ${deadlineFriendly}. Thankyou 😊

    ----------------
    Ensure the item numbering continues sequentially.
    If the time of day is morning, say Good morning. If evening, say Good evening.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "Could not generate message.";
  } catch (error) {
    console.error("Error generating invoice message:", error);
    return "Error generating message. Please try again.";
  }
};
