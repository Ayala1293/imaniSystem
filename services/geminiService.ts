
import { Product, Order, Client, ShopSettings } from "../types";
import { GoogleGenAI } from "@google/genai";

// Initialize the API client
// Always use the process.env.API_KEY string directly and assume it's pre-configured.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Fallback template generator if API key is missing or fails
const generateTemplateDescription = (name: string, attributes: string) => {
    return `Premium ${name} featuring ${attributes}. High quality and durable design suitable for modern needs.`;
};

const generateTemplateInvoice = (order: Order, client: Client, products: Product[], type: 'FOB' | 'FREIGHT', deadlineDateStr: string, settings: ShopSettings) => {
    const total = order.items.reduce((sum, item) => sum + (type === 'FOB' ? item.fobTotal : item.freightTotal), 0);

    if (type === 'FREIGHT') {
        const itemsList = order.items.map((item, index) => {
            const product = products.find(p => p.id === item.productId);
            const cost = item.freightTotal;
            const attrs = item.selectedAttributes.map(a => a.value).join('-');
            const attrString = attrs ? `-${attrs}` : '';
            if (!product || cost === 0) return null;
            // Format: 1.Hot water bottle-200
            return `${index + 1}.${product.name}${attrString}-${cost}`;
        }).filter(Boolean).join('\n');

        return `Good morning. Kindly find freight for your preorder below. 

${itemsList}

Total Ksh.${total}

*Payment details*
Paybill No.${settings.freightPaybill}
Account No.${settings.freightAccountNumber}`;
    }

    // Default FOB Template
    const itemsList = order.items.map((item, index) => {
        const product = products.find(p => p.id === item.productId);
        const cost = item.fobTotal;
        const attrs = item.selectedAttributes.map(a => a.value).join('-');
        const attrString = attrs ? `-${attrs}` : '';
        if (!product || cost === 0) return null;
        return `${index + 1}.${product.name}${attrString}-Ksh.${cost}`;
    }).filter(Boolean).join('\n');

    const paybill = settings.fobPaybill;
    const accNum = settings.fobAccountNumber;

    return `Good afternoon ${client.name.split(' ')[0]}. Kindly confirm your order below.

${itemsList}

Total Ksh.${total.toLocaleString()}

*Payment details*
Paybill No.${paybill}
Account No: ${accNum}

Payment deadline is ${new Date(deadlineDateStr).toLocaleDateString()}. Thankyou 😊`;
};

export const generateProductDescription = async (name: string, attributes: string): Promise<string> => {
  try {
      // Use gemini-3-flash-preview for Basic Text Tasks
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Write a short, catchy, professional sales description (max 2 sentences) for a product named "${name}" with these attributes: ${attributes}. Do not use hashtags.`,
      });
      // Directly access .text property from response
      return response.text?.trim() || generateTemplateDescription(name, attributes);
  } catch (error) {
      console.error("AI Generation Error:", error);
      return generateTemplateDescription(name, attributes);
  }
};

export const generateInvoiceMessage = async (order: Order, client: Client, products: Product[], type: 'FOB' | 'FREIGHT', deadlineDateStr: string, settings: ShopSettings): Promise<string> => {
  // Construct context for the AI
  const itemsList = order.items.map((item, index) => {
      const product = products.find(p => p.id === item.productId);
      const cost = type === 'FOB' ? item.fobTotal : item.freightTotal;
      const attrs = item.selectedAttributes.map(a => a.value).join('-');
      const attrString = attrs ? `-${attrs}` : '';
      if (!product || cost === 0) return null;
      // Use the hyphenated format for AI context too
      return `${index + 1}.${product.name}${attrString}-${cost}`;
  }).filter(Boolean).join('\n');

  const total = order.items.reduce((sum, item) => sum + (type === 'FOB' ? item.fobTotal : item.freightTotal), 0);
  const paybill = type === 'FOB' ? settings.fobPaybill : settings.freightPaybill;
  const accNum = type === 'FOB' ? settings.fobAccountNumber : settings.freightAccountNumber;

  let prompt = '';

  if (type === 'FREIGHT') {
     prompt = `
        Role: You are a shop assistant for "${settings.shopName}".
        Task: Write a WhatsApp freight invoice exactly in this format:
        
        Good morning. Kindly find freight for your preorder below. 
        
        [Numbered list of items with format: 1.Name-Cost]
        
        Total Ksh.[Total]
        
        *Payment details*
        Paybill No.[Paybill]
        Account No.[Account]

        Data:
        Items:
        ${itemsList}
        
        Total: ${total}
        Paybill: ${paybill}
        Account: ${accNum}
     `;
  } else {
     prompt = `
        Role: You are a friendly shop assistant for "${settings.shopName}".
        Task: Write a WhatsApp FOB invoice for a client named ${client.name}.
        
        Data:
        Items:
        ${itemsList}
        
        Total: Ksh ${total.toLocaleString()}
        Payment: Paybill ${paybill}, Account ${accNum}
        Deadline: ${new Date(deadlineDateStr).toLocaleDateString()}
        
        Format:
        - Casual but professional greeting.
        - Numbered list of items using "1.Name-Cost" format.
        - Clear Total.
        - Payment instructions.
        - Polite closing.
     `;
  }

  try {
      // Use gemini-3-flash-preview for Basic Text Tasks
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
      });
      // Directly access .text property from response
      return response.text?.trim() || generateTemplateInvoice(order, client, products, type, deadlineDateStr, settings);
  } catch (error) {
      console.error("AI Generation Error:", error);
      return generateTemplateInvoice(order, client, products, type, deadlineDateStr, settings);
  }
};
