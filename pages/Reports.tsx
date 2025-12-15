
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Download, Package, FolderOpen, ArrowLeft, Users, FileText } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Product } from '../types';

const Reports = () => {
  const { orders, products, catalogs, clients, shopSettings } = useAppStore();
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  const getCatalogOrders = () => !activeCatalogId ? [] : orders.filter(order => order.items.some(item => products.find(p => p.id === item.productId)?.catalogId === activeCatalogId));

  const getConsolidatedSummary = () => {
      const summary = new Map<string, { product: Product, totalQty: number }>();
      getCatalogOrders().forEach(order => order.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product && product.catalogId === activeCatalogId) {
              if (!summary.has(product.id)) summary.set(product.id, { product, totalQty: 0 });
              summary.get(product.id)!.totalQty += item.quantity;
          }
      }));
      return Array.from(summary.values());
  };

  const getClientOrderList = () => {
      const clientData: { clientName: string, phone: string, items: string[] }[] = [];
      getCatalogOrders().forEach(order => {
          const client = clients.find(c => c.id === order.clientId);
          const itemsForThisCatalog: string[] = [];
          order.items.forEach(item => {
              const product = products.find(p => p.id === item.productId);
              if (product && product.catalogId === activeCatalogId) {
                  itemsForThisCatalog.push(`${item.quantity} x ${product.name}${item.selectedAttributes.length ? ` (${item.selectedAttributes.map(a => a.value).join('-')})` : ''}`);
              }
          });
          if (client && itemsForThisCatalog.length) clientData.push({ clientName: client.name, phone: client.phone, items: itemsForThisCatalog });
      });
      return clientData.sort((a, b) => a.clientName.localeCompare(b.clientName));
  };

  const addWatermark = (doc: jsPDF) => {
      if (shopSettings.logoUrl) {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const imgWidth = 50; 
          const imgHeight = 50;
          const x = (pageWidth - imgWidth) / 2;
          const y = (pageHeight - imgHeight) / 2;
          
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.1 }));
          doc.addImage(shopSettings.logoUrl, 'PNG', x, y, imgWidth, imgHeight);
          doc.restoreGraphicsState();
      }
  };

  const generateDetailedProductPDF = () => {
    const doc = new jsPDF();
    addWatermark(doc);
    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text(`PRODUCT DISTRIBUTION: ${activeCatalog?.name}`, 105, 15, { align: "center" });
    let yPos = 30;
    products.filter(p => p.catalogId === activeCatalogId).forEach((product, index) => {
        const productOrders = getCatalogOrders().flatMap(order => {
            const item = order.items.find(i => i.productId === product.id);
            const client = clients.find(c => c.id === order.clientId);
            return item ? [{ clientName: client?.name||'Unknown', phone: client?.phone||'-', variant: item.selectedAttributes.map(a => a.value).join(', ')||'Standard', quantity: item.quantity }] : [];
        });
        if (!productOrders.length) return;
        if (yPos > 250) { doc.addPage(); addWatermark(doc); yPos = 20; }
        doc.setFontSize(12); doc.setFillColor(230); doc.rect(14, yPos - 5, 182, 8, 'F'); doc.text(`${index + 1}. ${product.name}`, 16, yPos); yPos += 5;
        autoTable(doc, {
            startY: yPos, head: [['Client', 'Phone', 'Variant', 'Qty']],
            body: productOrders.map(po => [po.clientName, po.phone, po.variant, po.quantity.toString()]),
            theme: 'grid', margin: { left: 14 }
        });
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 10;
    });
    doc.save(`Detailed_Distribution.pdf`);
  };

  const generateClientListPDF = () => {
      const doc = new jsPDF();
      addWatermark(doc);
      doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.text(`CLIENT ORDERS: ${activeCatalog?.name}`, 105, 15, { align: "center" });
      autoTable(doc, {
          startY: 30, head: [['Client Name', 'Phone', 'Ordered Items']],
          body: getClientOrderList().map(c => [c.clientName, c.phone, c.items.join('\n')])
      });
      doc.save(`Clients_List.pdf`);
  };

  if (!activeCatalogId) {
      return (
          <div className="space-y-6">
              <div><h2 className="text-3xl font-bold text-gray-800">Reports</h2><p className="text-gray-500">Select a catalog.</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{catalogs.map(c => (
                  <div key={c.id} onClick={() => setActiveCatalogId(c.id)} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-all cursor-pointer group hover-glow relative overflow-hidden">
                      <div className="flex mb-4"><div className="p-3 theme-bg-light theme-text rounded-lg"><FileText size={24} /></div></div>
                      <h3 className="text-xl font-bold text-gray-800">{c.name}</h3>
                      
                      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
                          <div><p className="text-xs text-gray-400 font-medium uppercase">Reports</p><p className="text-lg font-bold text-gray-800">2 Available</p></div>
                          <div><p className="text-xs text-gray-400 font-medium uppercase">Format</p><p className="text-lg font-bold text-gray-800">PDF</p></div>
                      </div>
                  </div>
              )})}</div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
        <div className="flex items-center gap-4 mb-6"><button onClick={() => setActiveCatalogId(null)} className="p-2 hover:bg-gray-200 rounded-full"><ArrowLeft size={20} className="text-gray-600"/></button><h2 className="text-3xl font-bold text-gray-800">Reports: {activeCatalog?.name}</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-2 flex items-center text-gray-800"><Package className="mr-2 theme-text"/> Detailed Product Report</h3>
                <p className="text-gray-500 text-sm mb-4">Export a breakdown of quantities per product.</p>
                <button onClick={generateDetailedProductPDF} className="w-full flex justify-center items-center px-4 py-3 theme-bg text-white rounded-lg transition-all font-bold"><Download size={18} className="mr-2" /> Export Item PDF</button>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-2 flex items-center text-gray-800"><Users className="mr-2 theme-text"/> Client Order List</h3>
                 <p className="text-gray-500 text-sm mb-4">Export a list of orders grouped by client.</p>
                <button onClick={generateClientListPDF} className="w-full flex justify-center items-center px-4 py-3 theme-bg text-white rounded-lg transition-all font-bold"><Download size={18} className="mr-2" /> Export Client PDF</button>
            </div>
        </div>
        <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-y-auto">
            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Preview Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getConsolidatedSummary().map((item, idx) => (<div key={item.product.id} className="bg-gray-50 border border-gray-200 p-3 text-sm flex justify-between rounded-lg"><span className="font-bold text-gray-700 truncate flex-1">{idx+1}. {item.product.name}</span><span className="font-bold bg-white border border-gray-200 px-2 py-1 rounded text-xs text-black">{item.totalQty} Units</span></div>))}
            </div>
        </div>
    </div>
  );
};

export default Reports;
