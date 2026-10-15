import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Product, StockMovement } from './types/inventory';
import { MetricsCards } from './components/MetricsCards';
import { InventoryTable } from './components/InventoryTable';
import { ProductModal } from './components/ProductModal';
import { StockMovementModal } from './components/StockMovementModal';
import { AiAssistant } from './components/AiAssistant';
import { AuthModal } from '@/components/AuthModal';
import { supabase } from '@/integrations/supabase/client';

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'EL-1001',
    name: 'Controlador Lógico CLP 24V',
    category: 'Automação',
    currentStock: 14,
    minStock: 5,
    unitCost: 450,
    unitPrice: 890,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    sku: 'EL-1002',
    name: 'Sensor Fotoelétrico Difuso',
    category: 'Sensores',
    currentStock: 3,
    minStock: 8,
    unitCost: 95,
    unitPrice: 199,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    sku: 'CAB-2001',
    name: 'Cabo Manga 4x26 AWG Blindado (m)',
    category: 'Cabeamento',
    currentStock: 320,
    minStock: 100,
    unitCost: 2.5,
    unitPrice: 6.8,
    lastUpdated: new Date().toISOString(),
  },
];

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('marisoft_inventory_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('marisoft_inventory_movements');
    return saved ? JSON.parse(saved) : [];
  });

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  useEffect(() => {
    // Carregar e persistir sessão ativa do Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('marisoft_inventory_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('marisoft_inventory_movements', JSON.stringify(movements));
  }, [movements]);

  const handleSaveProduct = (productData: Omit<Product, 'id' | 'lastUpdated'> & { id?: string }) => {
    if (productData.id) {
      setProducts(prev =>
        prev.map(p =>
          p.id === productData.id
            ? { ...p, ...productData, lastUpdated: new Date().toISOString() }
            : p
        )
      );
    } else {
      const newProduct: Product = {
        ...productData,
        id: `prod-${Date.now()}`,
        lastUpdated: new Date().toISOString(),
      };
      setProducts(prev => [newProduct, ...prev]);
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Deseja realmente excluir este produto?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSaveMovement = (movement: {
    productId: string;
    type: 'entrada' | 'saida';
    quantity: number;
    reason: string;
  }) => {
    const target = products.find(p => p.id === movement.productId);
    if (!target) return;

    const updatedStock =
      movement.type === 'entrada'
        ? target.currentStock + movement.quantity
        : Math.max(0, target.currentStock - movement.quantity);

    setProducts(prev =>
      prev.map(p =>
        p.id === movement.productId
          ? { ...p, currentStock: updatedStock, lastUpdated: new Date().toISOString() }
          : p
      )
    );

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      productId: movement.productId,
      productName: target.name,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      date: new Date().toLocaleString('pt-BR'),
    };

    setMovements(prev => [newMovement, ...prev.slice(0, 49)]);
    setIsMovementModalOpen(false);
  };

  const categories = ['Todas', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-cyan-400"></span>
              <h1 className="text-2xl font-bold tracking-tight text-white">MARISOFT IA</h1>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-md">
                Estoque Inteligente
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Painel de governança de itens, abastecimento e diagnósticos preditivos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="max-w-[140px] truncate" title={user.email || ''}>
                  {user.email}
                </span>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="ml-2 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Encerrar sessão"
                >
                  Sair
                </button>
              </div>
            )}
            <button
              onClick={() => setIsMovementModalOpen(true)}
              disabled={products.length === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white disabled:opacity-50 transition-colors"
            >
              Lançar Movimentação
            </button>
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            >
              + Novo Produto
            </button>
          </div>
        </header>

        <MetricsCards products={products} />

        <AiAssistant products={products} />

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <input
                type="text"
                placeholder="Buscar por nome ou SKU..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-slate-400">
              Exibindo {filteredProducts.length} de {products.length} itens
            </span>
          </div>

          <InventoryTable
            products={filteredProducts}
            onEdit={prod => {
              setEditingProduct(prod);
              setIsProductModalOpen(true);
            }}
            onDelete={handleDeleteProduct}
          />
        </section>
      </div>

      {isProductModalOpen && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
        />
      )}

      {isMovementModalOpen && products.length > 0 && (
        <StockMovementModal
          products={products}
          onClose={() => setIsMovementModalOpen(false)}
          onSaveMovement={handleSaveMovement}
        />
      )}

      {!authLoading && !user && <AuthModal isOpen={true} />}
    </main>
  );
}
