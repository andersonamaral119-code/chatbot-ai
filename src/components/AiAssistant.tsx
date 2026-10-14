import React, { useState } from 'react';
import { Product } from '../types/inventory';

interface AiAssistantProps {
  products: Product[];
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ products }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);

  const handleRunAiAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const generated: string[] = [];
      const lowItems = products.filter(p => p.currentStock <= p.minStock);
      const totalStock = products.reduce((acc, p) => acc + p.currentStock, 0);
      const totalCapital = products.reduce((acc, p) => acc + p.currentStock * p.unitCost, 0);

      if (lowItems.length > 0) {
        generated.push(
          `Alerta de Ruptura: Há ${lowItems.length} item(ns) atingindo ponto crítico de reposição (${lowItems
            .map(i => i.name)
            .join(', ')}). Recomendado reabastecer esta semana.`
        );
      } else {
        generated.push('Estoque Saudável: Não foram detectados riscos imediatos de ruptura.');
      }

      if (totalStock > 0) {
        const avgCost = totalCapital / totalStock;
        generated.push(
          `Otimização de Capital: Custo médio ponderado por unidade em estoque está em ${avgCost.toLocaleString(
            'pt-BR',
            { style: 'currency', currency: 'BRL' }
          )}.`
        );
      }

      const highMargin = products.filter(p => p.unitPrice > p.unitCost * 2);
      if (highMargin.length > 0) {
        generated.push(
          `Margem Alta: ${highMargin.length} produto(s) possuem margem superior a 100%. Priorize campanhas e visibilidade para ${highMargin[0]?.name}.`
        );
      }

      setInsights(generated);
      setAnalyzing(false);
    }, 600);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            MARISOFT IA — Diagnóstico Inteligente de Estoque
          </h3>
          <p className="text-xs text-slate-400">
            Geração de insights preditivos sobre ruptura de inventário, margens e giro.
          </p>
        </div>
        <button
          onClick={handleRunAiAnalysis}
          disabled={analyzing || products.length === 0}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition-colors"
        >
          {analyzing ? 'Analisando Estoque...' : 'Executar Análise IA'}
        </button>
      </div>

      {insights.length > 0 && (
        <ul className="space-y-2 mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
          {insights.map((msg, idx) => (
            <li key={idx} className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
              {msg}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
