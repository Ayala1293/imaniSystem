
import React from 'react';
import { useAppStore } from '../store';
import { Download, Package } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Product } from '../types';

const Reports = () => {
  const { orders, products } = useAppStore();

  // --- Consolidated Summary Logic ---

  const getConsolidatedSummary = () => {
      const summary = new Map<string, { product: Product, variants: Map<string, number> }>();

      orders.forEach(order => {
          order.items.forEach(item => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return;

              if (!summary.has(product.id)) {
                  summary.set(product.id, { product, variants: new Map() });
              }

              // Create a consistent key for variants (e.g. "Size: Small / Color: White")
              // Sorting attributes by key ensures "Size, Color" and "Color, Size" result in same variant key
              const attributes = [...item.selectedAttributes].sort((a, b) => a.key.localeCompare(b.key));
              
              const variantKey = attributes.length > 0 
                  ? attributes.map(a => a.value).join(' / ') 
                  : 'Standard';
              
              const currentQty = summary.get(product.id)!.variants.get(variantKey) || 0;
              summary.get(product.id)!.variants.set(variantKey, currentQty + item.quantity);
          });
      });
      return Array.from(summary.values());
  };

  const consolidatedData = getConsolidatedSummary();

  const generateConsolidatedPDF = () => {
    const doc = new jsPDF();
    
    // Report Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MONTHLY ORDER SUMMARY", 105, 15, { align: "center" });
    doc.line(14, 18, 196, 18); // Horizontal line

    let yPos = 25;

    consolidatedData.forEach((item, index) => {
        // Check page break
        if (yPos > 260) {
            doc.addPage();
            yPos = 20;
        }

        // Product Title
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}: ${item.product.name}`, 14, yPos);
        yPos += 5;

        // Prepare Table Data
        const variants = Array.from(item.variants.entries());
        const bodyData = variants.map(([variant, qty]) => [variant, qty.toString()]);
        const totalQty = variants.reduce((acc, curr) => acc + curr[1], 0);

        autoTable(doc, {
            startY: yPos,
            head: [['Variant / Type', 'Quantity']],
            body: bodyData,
            theme: 'plain', 
            styles: { 
                fontSize: 10,
                cellPadding: 1,
                lineColor: [200, 200, 200],
                lineWidth: 0.1
            },
            headStyles: { 
                fillColor: [240, 240, 240], 
                textColor: [0, 0, 0], 
                fontStyle: 'bold',
                halign: 'left'
            },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 40, fontStyle: 'bold' }
            },
            margin: { left: 14 },
            foot: [['TOTAL', totalQty.toString()]],
            footStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineColor: [0, 0, 0],
                lineWidth: { top: 0.1 }
            }
        });

        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 10;
    });

    doc.save("Monthly_Consolidated_Order_Summary.pdf");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Reports & Analytics</h2>
      </div>

      {/* New Consolidated Summary Section - Taking Full Height */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col min-h-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 flex-shrink-0">
                <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <Package className="mr-2 text-blue-600" />
                        Consolidated Order Summary
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">
                        Aggregated totals by product and variant for the current period.
                        </p>
                </div>
                <button 
                    onClick={generateConsolidatedPDF} 
                    className="flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-black transition-all shadow-md font-medium"
                >
                    <Download size={18} className="mr-2" />
                    Export Summary PDF
                </button>
            </div>
            
            {/* Visual Preview of Summary Grid */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {consolidatedData.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                            <Package size={64} className="mb-4 opacity-20" />
                            <p className="text-lg">No active order data available for summary.</p>
                        </div>
                    ) : (
                        consolidatedData.map((item, idx) => (
                            <div key={item.product.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow break-inside-avoid">
                                <h4 className="font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100 text-sm truncate" title={item.product.name}>
                                    {idx + 1}. {item.product.name}
                                </h4>
                                <div className="space-y-1">
                                    {Array.from(item.variants.entries()).map(([variant, qty]) => (
                                        <div key={variant} className="flex justify-between text-xs items-center p-1 hover:bg-gray-50 rounded">
                                            <span className="text-gray-600 font-medium truncate w-2/3" title={variant}>{variant}</span>
                                            <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">{qty}</span>
                                        </div>
                                    ))}
                                    <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between text-xs font-bold text-blue-600">
                                        <span>Total</span>
                                        <span>{Array.from(item.variants.values()).reduce((a, b) => a + b, 0)}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
      </div>
    </div>
  );
};

export default Reports;
