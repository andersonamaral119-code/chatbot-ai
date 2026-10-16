import React from 'react';
import { Product } from '../types/inventory';

interface MetricsCardsProps {
  products: Product[];
  entriesCount?: number;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ products, entriesCount = 0 }) => {
  const totalBoxes = products.reduce((acc, p) => acc + p.currentStock, 0);
  const totalFullPallets = products.reduce((acc, p) => {
    const bpp = p.boxes_per_pallet || 28;
    return acc + (p.full_pallets ?? Math.floor(p.currentStock / bpp));
  }, 0);
  const totalLooseBoxes = products.reduce((acc, p) => {
    const bpp = p.boxes_per_pallet || 28;
    return acc + (p.loose_boxes ?? (p.currentStock % bpp));
  }, 0);
  const lowStockCount = products.filter(p => p.currentStock <= p.minStock).length;
  const categoriesCount = new Set(products.map(p => p.category)).size;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Produtos Cadastrados</p>
        <p className="text-2xl font-bold text-white mt-1">{products.length}</p>
        <p className="text-xs text-slate-500 mt-1">{categoriesCount} categorias ativas</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total de Caixas</p>
        <p className="text-2xl font-bold text-cyan-400 mt-1">{totalBoxes.toLocaleString('pt-BR')} cx</p>
        <p className="text-xs text-slate-500 mt-1">{totalLooseBoxes} caixas avulsas</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pallets Completos</p>
        <p className="text-2xl font-bold text-emerald-400 mt-1">
          {totalFullPallets.toLocaleString('pt-BR')} plt
        </p>
        <p className="text-xs text-slate-500 mt-1">Regra de 28 cx / pallet</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Entradas Registradas</p>
        <p className="text-2xl font-bold text-purple-400 mt-1">
          {entriesCount}
        </p>
        <p className="text-xs text-slate-500 mt-1">{lowStockCount} produtos com alerta</p>
      </div>
    </div>
  );
};
