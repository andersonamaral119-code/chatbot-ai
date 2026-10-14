import React from 'react';
import { Product } from '../types/inventory';

interface MetricsCardsProps {
  products: Product[];
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ products }) => {
  const totalItems = products.reduce((acc, p) => acc + p.currentStock, 0);
  const totalValue = products.reduce((acc, p) => acc + (p.currentStock * p.unitCost), 0);
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
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Estoque Total</p>
        <p className="text-2xl font-bold text-sky-400 mt-1">{totalItems.toLocaleString('pt-BR')} un</p>
        <p className="text-xs text-slate-500 mt-1">Itens físicos em armazém</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Custo de Estoque</p>
        <p className="text-2xl font-bold text-emerald-400 mt-1">
          {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
        <p className="text-xs text-slate-500 mt-1">Avaliação ao custo médio</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Alerta Reposição</p>
        <p className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
          {lowStockCount}
        </p>
        <p className="text-xs text-slate-500 mt-1">Produtos abaixo do mínimo</p>
      </div>
    </div>
  );
};
