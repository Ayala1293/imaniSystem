
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Download, Package, FolderOpen, ArrowLeft, Users, FileText } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Product } from '../types';

const Reports = () => {
  const { orders, products, catalogs, clients } = useAppStore();
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  // --- Logic Helpers ---

  // Filter orders related to the active catalog
  const getCatalogOrders = () => {
      if (!activeCatalogId) return [];
      return orders.filter(order => {
          // Check if order has items belonging to this catalog
          return order.items.some(item => {
              const product = products.find(p => p.id === item.productId);
              return product?.catalogId === activeCatalogId;
          });
      });
  };

  // 1. Consolidated Summary Logic (Used for preview)
  const getConsolidatedSummary = () => {
      const summary = new Map<string, { product: Product, totalQty: number }>();
      const relevantOrders = getCatalogOrders();

      relevantOrders.forEach(order => {
          order.items.forEach(item => {
              const product = products.find(p => p.id === item.productId);
              if (!product || product.catalogId !== activeCatalogId) return;

              if (!summary.has(product.id)) {
                  summary.set(product.id, { product, totalQty: 0 });
              }
              summary.get(product.id)!.totalQty += item.quantity;
          });
      });
      return Array.from(summary.values());
  };

  // 2. Client Order List Logic
  const getClientOrderList = () => {
      const relevantOrders = getCatalogOrders();
      const clientData: { clientName: string, phone: string, items: string[] }[] = [];

      relevantOrders.forEach(order => {
          const client = clients.find(c => c.id === order.clientId);
          if (!client) return;

          const itemsForThisCatalog: string[] = [];
          
          order.items.forEach(item => {
              const product = products.find(p => p.id === item.productId);
              if (!product || product.catalogId !== activeCatalogId) return;

              const attrs = item.selectedAttributes.map(a => a.value).join('-');
              const attrStr = attrs ? ` (${attrs})` : '';
              itemsForThisCatalog.push(`${item.quantity} x ${product.name}${attrStr}`);
          });

          if (itemsForThisCatalog.length > 0) {
              clientData.push({
                  clientName: client.name,
                  phone: client.phone,
                  items: itemsForThisCatalog
              });
          }
      });
      
      // Sort by Client Name
      return clientData.sort((a, b) => a.clientName.localeCompare(b.clientName));
  };

  // --- PDF Generators ---

  const generateDetailedProductPDF = () => {
    const doc = new jsPDF();
    const productsInCatalog = products.filter(p => p.catalogId === activeCatalogId);

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`PRODUCT DISTRIBUTION REPORT: ${activeCatalog?.name}`, 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 20, { align: "center" });
    doc.line(14, 22, 196, 22);

    let yPos = 30;

    if (productsInCatalog.length === 0) {
        doc.text("No products found in this catalog.", 14, 30);
    }

    productsInCatalog.forEach((product, index) => {
        // Collect orders for this product
        const productOrders = getCatalogOrders().flatMap(order => {
            const item = order.items.find(i => i.productId === product.id);
            if (!item) return [];
            
            const client = clients.find(c => c.id === order.clientId);
            const variantStr = item.selectedAttributes.map(a => `${a.key}:${a.value}`).join(', ') || 'Standard';

            return [{
                clientName: client?.name || 'Unknown',
                phone: client?.phone || '-',
                variant: variantStr,
                quantity: item.quantity
            }];
        });

        if (productOrders.length === 0) return; // Skip products with no orders

        // Check page break
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        // Product Header
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setFillColor(230, 230, 230);
        doc.rect(14, yPos - 5, 182, 8, 'F');
        doc.text(`${index + 1}. ${product.name}`, 16, yPos);
        yPos += 5;

        // Table Data
        const tableBody = productOrders.map(po => [
            po.clientName,
            po.phone,
            po.variant,
            po.quantity.toString()
        ]);
        
        const totalQty = productOrders.reduce((sum, po) => sum + po.quantity, 0);

        autoTable(doc, {
            startY: yPos,
            head: [['Client Name', 'Phone Number', 'Variables / Option', 'Qty']],
            body: tableBody,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 1.5, lineColor: [200, 200, 200] },
            headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: { 
                0: { cellWidth: 50 }, 
                1: { cellWidth: 40 }, 
                2: { cellWidth: 'auto' }, 
                3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' } 
            },
            margin: { left: 14 },
            foot: [['', '', 'TOTAL UNITS', totalQty.toString()]],
            footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' }
        });

        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 10;
    });

    doc.save(`${activeCatalog?.name.replace(/\s/g, '_')}_Detailed_Distribution.pdf`);
  };

  const generateClientListPDF = () => {
      const data = getClientOrderList();
      const doc = new jsPDF();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`CLIENT ORDERS: ${activeCatalog?.name}`, 105, 15, { align: "center" });
      doc.line(14, 22, 196, 22);

      const tableBody = data.map(c => [
          c.clientName,
          c.phone,
          c.items.join('\n')
      ]);

      autoTable(doc, {
          startY: 30,
          head: [['Client Name', 'Phone', 'Ordered Items']],
          body: tableBody,
          styles: { fontSize: 10, cellPadding: 3, overflow: 'linebreak' },
          headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: { 2: { cellWidth: 100 } }
      });

      doc.save(`${activeCatalog?.name.replace(/\s/g, '_')}_Clients.pdf`);
  };

  // --- Views ---

  if (!activeCatalogId) {
      return (
          <div className="space-y-6">
              <div>
                  <h2 className="text-3xl font-bold text-gray-800">Reports & Analytics</h2>
                  <p className="text-gray-500">Select a monthly catalog to view specific reports and export data.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catalogs.map(catalog => (
                      <div 
                          key={catalog.id} 
                          onClick={() => setActiveCatalogId(catalog.id)}
                          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                      >
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                  <FileText size={24} />
                              </div>
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                                  {new Date(catalog.closingDate).toLocaleDateString()}
                              </span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mb-1">{catalog.name}</h3>
                          <p className="text-sm text-gray-500">
                             {/* Mock Stat */}
                             Click to view export options
                          </p>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  const consolidatedData = getConsolidatedSummary();
  const clientListData = getClientOrderList();

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
        <div className="flex items-center gap-4 mb-6">
            <button 
                onClick={() => setActiveCatalogId(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
                <ArrowLeft size={20} className="text-gray-600"/>
            </button>
            <div>
                <h2 className="text-3xl font-bold text-gray-800">Reports: {activeCatalog?.name}</h2>
                <p className="text-sm text-gray-500">Generate PDF exports for this month.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Report Card 1 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center mb-2">
                        <Package className="mr-2 text-blue-600" />
                        Detailed Product Distribution
                    </h3>
                    <p className="text-gray-500 text-sm mb-4">
                        A detailed breakdown per item showing who ordered it, their phone number, and specific variables/options selected.
                    </p>
                </div>
                <button 
                    onClick={generateDetailedProductPDF} 
                    className="w-full flex justify-center items-center px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all font-bold"
                >
                    <Download size={18} className="mr-2" />
                    Export Detailed Item PDF
                </button>
            </div>

            {/* Report Card 2 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center mb-2">
                        <Users className="mr-2 text-green-600" />
                        Client Order List
                    </h3>
                    <p className="text-gray-500 text-sm mb-4">
                        Detailed list of clients and exactly what they ordered. Includes phone numbers for contact.
                    </p>
                    <div className="text-xs font-bold bg-green-50 text-green-700 px-3 py-1 rounded w-fit mb-4">
                        {clientListData.length} Clients Ordered
                    </div>
                </div>
                <button 
                    onClick={generateClientListPDF} 
                    className="w-full flex justify-center items-center px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all font-bold"
                >
                    <Download size={18} className="mr-2" />
                    Export Client List PDF
                </button>
            </div>
        </div>
        
        {/* Preview Section */}
        <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-0">
            <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Quick Preview (Total Quantities)</h3>
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {consolidatedData.length === 0 ? (
                        <p className="text-gray-400 italic col-span-full text-center py-10">No orders found for this catalog.</p>
                    ) : (
                        consolidatedData.map((item, idx) => (
                            <div key={item.product.id} className="bg-gray-50 border border-gray-200 rounded p-3 text-sm flex justify-between items-center">
                                <span className="font-bold text-gray-900 truncate flex-1">{idx + 1}. {item.product.name}</span>
                                <span className="font-bold bg-white border border-gray-300 px-2 py-1 rounded text-xs">{item.totalQty} Units</span>
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
