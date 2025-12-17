
import { useState } from 'react';
import { useAppStore } from '../store';
import { Download, Package, ArrowLeft, Users, FileText } from 'lucide-react';
import { jsPDF, GState } from "jspdf";
import autoTable from "jspdf-autotable";
import { Product } from '../types';

const Reports = () => {
  const { orders, products, catalogs, clients, shopSettings } = useAppStore();
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  // --- Data Helpers ---

  // Filter orders for the current catalog
  const getCatalogOrders = () => !activeCatalogId ? [] : orders.filter(order => order.items.some(item => products.find(p => p.id === item.productId)?.catalogId === activeCatalogId));

  // 1. Prepare Product Summary Data
  const getProductSummaryData = () => {
      const summary = new Map<string, { product: Product, variants: Map<string, number>, totalQty: number }>();
      
      getCatalogOrders().forEach(order => order.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          // Only count items belonging to this catalog
          if (product && product.catalogId === activeCatalogId) {
              if (!summary.has(product.id)) {
                  summary.set(product.id, { product, variants: new Map(), totalQty: 0 });
              }
              
              const entry = summary.get(product.id)!;
              
              const variantKey = item.selectedAttributes.length > 0 
                  ? item.selectedAttributes.map(a => `${a.value}`).join(' ') 
                  : 'Standard';

              const currentVariantQty = entry.variants.get(variantKey) || 0;
              entry.variants.set(variantKey, currentVariantQty + item.quantity);
              entry.totalQty += item.quantity;
          }
      }));

      // Convert Map to Array for AutoTable
      return Array.from(summary.values()).map(item => {
          const variantDetails = Array.from(item.variants.entries())
              .map(([variant, qty]) => `${variant} (x${qty})`)
              .join(',\n');

          return [
              item.product.name,
              item.product.category,
              variantDetails,
              item.totalQty.toString()
          ];
      });
  };

  // 2. Prepare Client List Data
  const getClientData = () => {
      const clientData: { id: string, name: string, phone: string, items: string[] }[] = [];
      const orders = getCatalogOrders();

      orders.forEach(order => {
          const client = clients.find(c => c.id === order.clientId);
          if (!client) return;

          let entry = clientData.find(c => c.id === client.id);
          if (!entry) {
              entry = { id: client.id, name: client.name, phone: client.phone, items: [] };
              clientData.push(entry);
          }

          order.items.forEach(item => {
              const product = products.find(p => p.id === item.productId);
              if (product && product.catalogId === activeCatalogId) {
                  const attrs = item.selectedAttributes.map(a => a.value).join(' ');
                  const attrStr = attrs ? `[${attrs}]` : '';
                  entry!.items.push(`${item.quantity}x ${product.name} ${attrStr}`);
              }
          });
      });

      return clientData
          .filter(c => c.items.length > 0)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(c => [
              c.name,
              c.phone,
              c.items.join('\n')
          ]);
  };

  // --- PDF Generators ---

  const initPDF = (title: string) => {
      const doc = new jsPDF();
      
      const primaryColor = shopSettings.theme.primary;
      const secondaryColor = shopSettings.theme.secondary;

      // 0. Watermark (Underneath everything)
      if (shopSettings.logoUrl) {
          try {
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            
            // Calculate dimensions to keep aspect ratio, max width 100mm
            const imgProps = doc.getImageProperties(shopSettings.logoUrl);
            const imgWidth = 80; 
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            
            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;

            // Detect format from base64 string
            const formatMatch = shopSettings.logoUrl.match(/^data:image\/(\w+);base64,/);
            const format = formatMatch ? formatMatch[1].toUpperCase() : 'PNG';

            // Set transparency to very light (0.1)
            doc.saveGraphicsState();
            doc.setGState(new GState({ opacity: 0.08 }));
            doc.addImage(shopSettings.logoUrl, format, x, y, imgWidth, imgHeight, undefined, 'FAST');
            doc.restoreGraphicsState();
          } catch (e) {
              console.warn("Failed to add watermark", e);
          }
      }

      // 1. Header Bar (Secondary Color)
      doc.setFillColor(secondaryColor);
      doc.rect(0, 0, doc.internal.pageSize.width, 24, 'F');

      // 2. Shop Name (White)
      doc.setTextColor("#FFFFFF");
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(shopSettings.shopName, 14, 16);

      // 3. Document Title (Primary/Gold Color)
      doc.setTextColor(primaryColor);
      doc.setFontSize(18);
      doc.text(title.toUpperCase(), 14, 40);

      // 4. Catalog Subtitle
      if (activeCatalog) {
          doc.setTextColor("#555555");
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(`Catalog: ${activeCatalog.name}`, 14, 46);
      }

      return { doc, primaryColor, secondaryColor };
  };

  const generateProductSummaryPDF = () => {
      const { doc, secondaryColor } = initPDF(`Product Summary`);
      const tableData = getProductSummaryData();

      autoTable(doc, {
          startY: 55,
          head: [['Product Name', 'Category', 'Variant Breakdown', 'Total Qty']],
          body: tableData,
          theme: 'grid',
          headStyles: { 
              fillColor: secondaryColor, 
              textColor: "#FFFFFF",
              fontStyle: 'bold' 
          },
          columnStyles: {
              0: { fontStyle: 'bold', cellWidth: 50 }, // Product Name
              2: { cellWidth: 'auto' }, // Variants
              3: { halign: 'center', fontStyle: 'bold', cellWidth: 20 } // Qty
          },
          alternateRowStyles: {
              fillColor: "#F9FAFB"
          },
          margin: { top: 55 }
      });

      doc.save(`Summary_${activeCatalog?.name.replace(/\s+/g, '_')}.pdf`);
  };

  const generateClientListPDF = () => {
      const { doc, primaryColor } = initPDF(`Client Order List`);
      const tableData = getClientData();

      autoTable(doc, {
          startY: 55,
          head: [['Client Name', 'Phone Contact', 'Ordered Items']],
          body: tableData,
          theme: 'grid',
          headStyles: { 
              fillColor: primaryColor, 
              textColor: "#FFFFFF",
              fontStyle: 'bold' 
          },
          columnStyles: {
              0: { fontStyle: 'bold', cellWidth: 40 },
              1: { cellWidth: 35 },
              2: { cellWidth: 'auto' }
          },
          styles: {
              cellPadding: 4,
              overflow: 'linebreak'
          },
          margin: { top: 55 }
      });

      doc.save(`Clients_${activeCatalog?.name.replace(/\s+/g, '_')}.pdf`);
  };

  if (!activeCatalogId) {
      return (
          <div className="space-y-6">
              <div><h2 className="text-3xl font-bold text-gray-800">Reports Center</h2><p className="text-gray-500">Select a catalog to generate reports.</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalogs.map(c => (
                  <div key={c.id} onClick={() => setActiveCatalogId(c.id)} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-all cursor-pointer group hover-glow relative overflow-hidden">
                      <div className="flex mb-4"><div className="p-3 theme-bg-light theme-text rounded-lg"><FileText size={24} /></div></div>
                      <h3 className="text-xl font-bold text-gray-800">{c.name}</h3>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                          <span className="text-xs text-gray-500 font-bold uppercase">Status</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${c.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span>
                      </div>
                  </div>
                ))}
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
        <div className="flex items-center gap-4 mb-6"><button onClick={() => setActiveCatalogId(null)} className="p-2 hover:bg-gray-200 rounded-full"><ArrowLeft size={20} className="text-gray-600"/></button><h2 className="text-3xl font-bold text-gray-800">Reports: {activeCatalog?.name}</h2></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Product Summary Card */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full theme-bg"></div>
                <h3 className="text-xl font-bold mb-2 flex items-center text-gray-800"><Package className="mr-3 theme-text" size={24}/> Product Summary</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                    Generates a consolidated list of all products ordered in this catalog. 
                    Includes a breakdown of total quantities per variant (e.g., "Size 42 Red").
                </p>
                <button onClick={generateProductSummaryPDF} className="w-full flex justify-center items-center px-6 py-4 theme-bg text-white rounded-xl transition-all font-bold shadow-lg hover:brightness-110 active:scale-95">
                    <Download size={20} className="mr-2" /> Download Product Summary PDF
                </button>
            </div>

            {/* Client List Card */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: 'var(--color-secondary)' }}></div>
                <h3 className="text-xl font-bold mb-2 flex items-center text-gray-800"><Users className="mr-3" style={{ color: 'var(--color-secondary)' }} size={24}/> Client Order List</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                    Generates a master list of all clients who have ordered from this catalog.
                    Lists every specific item and variant ordered by each person.
                </p>
                <button onClick={generateClientListPDF} className="w-full flex justify-center items-center px-6 py-4 text-white rounded-xl transition-all font-bold shadow-lg hover:opacity-90 active:scale-95" style={{ backgroundColor: 'var(--color-secondary)' }}>
                    <Download size={20} className="mr-2" /> Download Client List PDF
                </button>
            </div>
        </div>

        {/* Live Preview Area */}
        <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center"><FileText size={16} className="mr-2 text-gray-400"/> Quick Preview: Top 5 Items</h3>
            <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                        <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Variant Breakdown</th><th className="px-4 py-3 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {getProductSummaryData().slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-bold text-gray-800">{row[0]}</td>
                                <td className="px-4 py-3 text-gray-600 whitespace-pre-wrap font-mono text-xs">{row[2].replace(/\n/g, ', ')}</td>
                                <td className="px-4 py-3 text-right font-bold theme-text">{row[3]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default Reports;
