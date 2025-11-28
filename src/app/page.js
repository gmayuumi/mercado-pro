"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Package, DollarSign, LogOut, TrendingUp, 
  AlertTriangle, Plus, List, TrendingDown, Calendar, Tag, 
  BarChart3, Filter, ChevronRight, Store, User, Loader2, Trash2, X, Edit, ArrowRightLeft, ArrowUpCircle, ArrowDownCircle, CheckCircle, Lock, MessageCircle, Menu, Bell, Search, Settings, Save, Percent
} from 'lucide-react';

// IMPORTAR AS FUNÇÕES DO FIREBASE
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  setDoc,
  getDoc,
  query, 
  where 
} from "firebase/firestore";

// ============================================================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyChgvP8008ti9TkmzYyguPhTBpH-jq-Bzo", 
  authDomain: "mercadopro-70447.firebaseapp.com",
  projectId: "mercadopro-70447",
  storageBucket: "mercadopro-70447.firebasestorage.app",
  messagingSenderId: "639521827242",
  appId: "1:639521827242:web:9d48fc7bb6376eb12323d3",
  measurementId: "G-BXYC5K1M0S"
};

// Inicialização do Firebase
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Erro crítico ao iniciar Firebase:", e);
}

// ============================================================================
// LISTA DE PRODUTOS COMUNS
// ============================================================================
const SUGESTOES_PADRAO = [
  "Arroz Branco Camil 5kg", "Arroz Branco Tio João 5kg", "Feijão Carioca Camil 1kg", "Feijão Preto Kicaldo 1kg",
  "Açúcar Refinado União 1kg", "Sal Refinado Cisne 1kg", "Farinha de Trigo Dona Benta 1kg",
  "Macarrão Espaguete Adria 500g", "Molho de Tomate Pomarola 340g", "Óleo de Soja Liza 900ml",
  "Café Pilão 500g", "Café Melitta 500g", "Leite Integral Italac 1L", "Manteiga Aviação 200g", "Margarina Qualy 500g",
  "Refrigerante Coca-Cola 2L", "Refrigerante Guaraná Antarctica 2L", "Cerveja Skol Lata 350ml", "Cerveja Heineken 330ml",
  "Sabão em Pó Omo 800g", "Detergente Ypê 500ml", "Água Sanitária Qboa 1L", "Papel Higiênico Neve 4un",
  "Creme Dental Colgate 90g", "Sabonete Dove 90g"
];

// ============================================================================
// SERVICE LAYER
// ============================================================================
const api = {
  auth: {
    login: async (email, senha) => {
      if (!auth) throw new Error("O Firebase não foi iniciado corretamente.");
      return await signInWithEmailAndPassword(auth, email.trim(), senha);
    },
    onStateChanged: (callback) => {
      if (!auth) return () => {};
      return onAuthStateChanged(auth, callback);
    },
    logout: async () => {
      if (auth) await signOut(auth);
    }
  },
  
  config: {
    get: async (userUid) => {
      if (!userUid || !db) return { metaDiaria: 1000, nomeEmpresa: "Minha Loja" };
      try {
        const docRef = doc(db, "users", userUid, "config", "geral");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return docSnap.data();
        return { metaDiaria: 1000, nomeEmpresa: "Minha Loja" };
      } catch (e) { return { metaDiaria: 1000, nomeEmpresa: "Minha Loja" }; }
    },
    save: async (userUid, data) => {
      if (!db) return;
      await setDoc(doc(db, "users", userUid, "config", "geral"), data, { merge: true });
    }
  },

  produtos: {
    listar: async (userUid) => {
      if (!userUid || !db) return [];
      try {
        const q = collection(db, "users", userUid, "produtos");
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      } catch (error) { return []; }
    },
    criar: async (userUid, produto) => {
      if (!db) throw new Error("Banco de dados não conectado");
      const { id, ...dadosProduto } = produto; 
      const produtoSeguro = {
        ...dadosProduto,
        precoCusto: Number(produto.precoCusto) || 0,
        precoVenda: Number(produto.precoVenda) || 0,
        estoque: Number(produto.estoque) || 0,
      };
      const docRef = await addDoc(collection(db, "users", userUid, "produtos"), produtoSeguro);
      return { id: docRef.id, ...produtoSeguro };
    },
    excluir: async (userUid, id) => {
      if (!db) return;
      await deleteDoc(doc(db, "users", userUid, "produtos", id));
    },
    update: async (userUid, id, data) => {
      if (!db) return;
      await updateDoc(doc(db, "users", userUid, "produtos", id), data);
    },
    ajustarEstoque: async (userUid, id, quantidade) => {} 
  },
  
  vendas: {
    listar: async (userUid) => {
      if (!userUid || !db) return [];
      try {
        const q = collection(db, "users", userUid, "vendas");
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      } catch (error) { return []; }
    },
    criar: async (userUid, venda) => {
      if (!db) return;
      const docRef = await addDoc(collection(db, "users", userUid, "vendas"), venda);
      return { id: docRef.id, ...venda };
    },
    excluir: async (userUid, id) => {
      if (!db) return;
      await deleteDoc(doc(db, "users", userUid, "vendas", id));
    },
    atualizar: async (userUid, id, data) => {
      if (!db) return;
      await updateDoc(doc(db, "users", userUid, "vendas", id), data);
    }
  }
};

// ============================================================================
// UTILITÁRIOS DE DATA CORRIGIDOS
// ============================================================================

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return new Date(dateStr);
};

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  if (dateStr.includes('-')) {
    const [a, m, d] = dateStr.split('-');
    return `${d}/${m}/${a}`;
  }
  return dateStr;
};

const Badge = ({ children, type }) => {
  const styles = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    danger: 'bg-rose-100 text-rose-700 border-rose-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-bold border ${styles[type] || styles.neutral}`}>{children}</span>;
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-rose-50 rounded-full text-rose-600"><AlertTriangle size={24} /></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors text-sm">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all text-sm">Confirmar</button>
        </div>
      </div>
    </div>
  );
};

const AlertModal = ({ isOpen, onClose, title, message, type = 'success' }) => {
  if (!isOpen) return null;
  const isSuccess = type === 'success';
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-full ${isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {isSuccess ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">{message}</p>
        <button onClick={onClose} className={`w-full px-4 py-2.5 rounded-xl text-white font-semibold shadow-lg transition-all text-sm ${isSuccess ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}>OK, Entendido</button>
      </div>
    </div>
  );
};

const StockModal = ({ isOpen, onClose, onSave, produto }) => {
  const [qtd, setQtd] = useState('');
  const [tipo, setTipo] = useState('entrada'); 
  useEffect(() => { if (isOpen) { setQtd(''); setTipo('entrada'); } }, [isOpen]);
  if (!isOpen || !produto) return null;
  const handleSave = () => {
    const quantidade = parseInt(qtd);
    if (!quantidade || quantidade <= 0) return alert("Digite uma quantidade válida");
    const ajuste = tipo === 'entrada' ? quantidade : -quantidade;
    onSave(produto.id, ajuste);
  };
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">Ajuste Rápido</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Produto</span>
            <div className="font-bold text-slate-800 text-lg">{produto.nome}</div>
            <div className="text-xs text-slate-500 mt-1">Atual: {produto.estoque} unidades</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setTipo('entrada')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${tipo === 'entrada' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}><ArrowUpCircle size={24} /><span className="text-xs font-bold uppercase">Entrada</span></button>
            <button onClick={() => setTipo('saida')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${tipo === 'saida' ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}><ArrowDownCircle size={24} /><span className="text-xs font-bold uppercase">Saída</span></button>
          </div>
          <Input label="Quantidade" type="number" min="1" placeholder="0" value={qtd} onChange={e => setQtd(e.target.value)} autoFocus className="text-lg font-bold" />
          <Button onClick={handleSave} className="w-full mt-2 py-3 text-base">Confirmar Ajuste</Button>
        </div>
      </div>
    </div>
  );
};

// MODAL DE PROMOÇÃO (AGORA CONECTADO)
const PromotionModal = ({ isOpen, onClose, onSave, produto }) => {
  const [desconto, setDesconto] = useState('');
  const [novoPreco, setNovoPreco] = useState(0);

  useEffect(() => {
    if (isOpen && produto) {
      setDesconto('');
      setNovoPreco(produto.precoVenda);
    }
  }, [isOpen, produto]);

  useEffect(() => {
    if (produto && desconto) {
      const valorDesconto = (produto.precoVenda * parseFloat(desconto)) / 100;
      setNovoPreco(Math.max(0, produto.precoVenda - valorDesconto));
    } else if (produto) {
      setNovoPreco(produto.precoVenda);
    }
  }, [desconto, produto]);

  if (!isOpen || !produto) return null;

  const handleConfirm = () => {
    if (!desconto && parseFloat(novoPreco) === produto.precoVenda) {
        // Se não alterou nada, apenas fecha
        onClose();
        return;
    }
    // Chama a função de salvar passando o ID, o novo preço e a flag de promoção
    onSave(produto.id, novoPreco);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <Tag size={20} className="text-amber-500"/> {produto.emPromocao ? 'Editar Promoção' : 'Criar Promoção'}
          </h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
             <p className="text-xs font-bold text-slate-400 uppercase">Produto</p>
             <p className="font-bold text-slate-800">{produto.nome}</p>
             <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-slate-500">Preço Atual:</span>
                <span className="font-bold text-slate-700">R$ {produto.precoVenda.toFixed(2)}</span>
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-sm font-bold text-slate-600">Desconto (%)</label>
             <div className="relative">
               <input 
                 type="number" 
                 value={desconto} 
                 onChange={e => setDesconto(e.target.value)}
                 className="w-full pl-4 pr-10 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 font-bold text-lg text-slate-800"
                 placeholder="20"
                 autoFocus
               />
               <Percent size={20} className="absolute right-3 top-3.5 text-slate-400" />
             </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center">
             <span className="text-sm font-bold text-emerald-700">NOVO PREÇO:</span>
             <span className="text-xl font-extrabold text-emerald-600">R$ {novoPreco.toFixed(2)}</span>
          </div>

          <Button onClick={handleConfirm} className="w-full py-3 text-base bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200">
            Aplicar Promoção
          </Button>
        </div>
      </div>
    </div>
  );
};

const EditSaleModal = ({ isOpen, onClose, onSave, venda }) => {
  const [qtd, setQtd] = useState(venda?.qtd || 0);
  const [total, setTotal] = useState(venda?.total || 0);
  const formatToInputDate = (dateStr) => {
    if (!dateStr) return '';
    const [d, m, a] = dateStr.split('/');
    return `${a}-${m}-${d}`;
  };
  const [data, setData] = useState(formatToInputDate(venda?.data));
  useEffect(() => { if (venda) { setQtd(venda.qtd); setTotal(venda.total); setData(formatToInputDate(venda.data)); } }, [venda]);
  if (!isOpen) return null;
  const handleSave = () => {
    const [a, m, d] = data.split('-');
    onSave(venda.id, { qtd: parseInt(qtd), total: parseFloat(total), data: `${d}/${m}/${a}` });
  };
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">Editar Venda #{venda?.id}</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        <div className="space-y-5">
           <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Produto</span>
            <div className="font-bold text-slate-800 text-lg">{venda?.produto}</div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <Input label="Quantidade" type="number" value={qtd} onChange={e => setQtd(e.target.value)} />
            <Input label="Total (R$)" type="number" value={total} onChange={e => setTotal(e.target.value)} />
          </div>
          <Input label="Data" type="date" value={data} onChange={e => setData(e.target.value)} />
          <Button onClick={handleSave} className="w-full mt-4 py-3">Salvar Alterações</Button>
        </div>
      </div>
    </div>
  );
};

const Card = ({ title, value, subtext, icon: Icon, trend }) => (
  <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 relative group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : trend === 'down' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
        <Icon size={24} strokeWidth={2} />
      </div>
    </div>
    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
    <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
    <p className="text-xs text-slate-400 mt-2 font-medium">{subtext}</p>
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', disabled, loading, ...props }) => {
  const variants = {
    primary: 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm',
    accent: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
  };
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${variants[variant] || variants.primary} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} {...props}>
      {loading && <Loader2 size={16} className="animate-spin" />} {children}
    </button>
  );
};

const Input = ({ label, className, ...props }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">{label}</label>}
    <input className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium ${className}`} {...props} />
  </div>
);

// SIDEBAR NAVIGATION
const Sidebar = ({ setPagina, paginaAtual, onLogout, nomeEmpresa }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: BarChart3 },
    { id: 'produtos', label: 'Produtos & Estoque', icon: Package },
    { id: 'vendas', label: 'Ponto de Venda', icon: ShoppingCart },
    { id: 'relatorios', label: 'Relatórios', icon: List },
    { id: 'caixa', label: 'Fluxo de Caixa', icon: DollarSign },
    { id: 'configuracoes', label: 'Configurações', icon: Settings }, 
  ];
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-50">
         <div className="flex items-center gap-2"><div className="bg-blue-600 p-1.5 rounded-lg"><Store size={20} className="text-white"/></div><span className="font-bold text-slate-800">MercadoPRO</span></div>
         <button onClick={() => setIsOpen(!isOpen)} className="text-slate-600"><Menu /></button>
      </div>
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:h-screen flex flex-col`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
           <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-900/20"><Store size={24} className="text-white" /></div>
           <div><h1 className="font-bold text-white text-lg leading-tight">MercadoPRO</h1><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enterprise</p></div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
           <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Menu Principal</p>
           {menuItems.map(item => (
             <button key={item.id} onClick={() => { setPagina(item.id); setIsOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${paginaAtual === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
               <item.icon size={18} className={paginaAtual === item.id ? 'text-blue-200' : 'text-slate-500 group-hover:text-white'} />{item.label}
             </button>
           ))}
        </div>
        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-all"><LogOut size={18} /> Sair do Sistema</button>
        </div>
      </aside>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsOpen(false)}></div>}
    </>
  );
};

// NOVA TELA DE LOGIN 
const PaginaLogin = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  
  const handleLogin = async () => {
    setLoading(true);
    try { 
      const user = await api.auth.login(email, senha); 
      onLogin(user);
    } 
    catch (e) { 
      console.error("Erro Login:", e);
      let msg = "Erro desconhecido.";
      const code = e.code || "";
      const message = e.message || "Sem detalhes";

      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        msg = "Email ou senha incorretos.";
      } else if (code === 'auth/invalid-email') {
        msg = "O endereço de email é inválido.";
      } else if (code === 'auth/api-key-not-valid') {
        msg = "A chave (API Key) do Firebase está incorreta.";
      } else if (message.includes("Firebase não iniciado")) {
        msg = "Erro de configuração: Firebase não iniciado.";
      } else {
        msg = `Erro técnico: ${code} - ${message}`;
      }
      alert(msg); 
    } 
    finally { setLoading(false); }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4 relative overflow-hidden">
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[5%] w-[500px] h-[500px] bg-blue-200 rounded-full blur-[120px] opacity-40"></div>
          <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] bg-cyan-200 rounded-full blur-[100px] opacity-40"></div>
       </div>

      <div className="bg-white rounded-3xl shadow-2xl w-[80%] h-[80vh] overflow-hidden flex relative z-10">
        
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-600 to-cyan-700 relative items-center justify-center p-12 text-white">
           <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
               <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="absolute top-[-50px] left-[-50px] w-[400px] animate-spin-slow duration-[60s]">
                 <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.5,71.3,32.6C60.4,43.7,49.9,53,38.2,61.2C26.5,69.4,13.6,76.4,-0.8,77.8C-15.2,79.2,-29.1,75,-40.8,66.8C-52.5,58.6,-62,46.4,-69.9,33.1C-77.8,19.8,-84,5.4,-81.8,-7.8C-79.6,-21,-69,-33,-57.4,-41.9C-45.8,-50.8,-33.2,-56.6,-20.3,-64.5C-7.4,-72.4,5.8,-82.4,20.5,-83.6C35.2,-84.8,51.4,-77.2,44.7,-76.4Z" transform="translate(100 100)" />
               </svg>
           </div>

           <div className="relative z-10 text-center">
             <div className="inline-flex p-4 bg-white/10 backdrop-blur-sm rounded-3xl mb-8 border border-white/20">
               <Store size={56} />
             </div>
             <h1 className="text-5xl font-bold mb-6">MercadoPRO</h1>
             <p className="text-blue-100 text-xl leading-relaxed max-w-md mx-auto font-light">
               Controle total do seu negócio em um só lugar. <br/>Simples, rápido e seguro.
             </p>
           </div>
        </div>

        <div className="w-full md:w-1/2 p-12 md:p-16 flex flex-col justify-center relative bg-blue-50">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-12">
              <h2 className="text-4xl font-bold text-slate-800 mb-3">Entrar</h2>
              <p className="text-slate-500 text-lg">Bem-vindo de volta! Insira seus dados.</p>
            </div>

            <div className="space-y-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="text-slate-400" size={24} />
                </div>
                <input 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Seu e-mail"
                  className="w-full pl-14 pr-4 py-4 text-lg bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="text-slate-400" size={24} />
                </div>
                <input 
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  type="password"
                  placeholder="Sua senha"
                  className="w-full pl-14 pr-4 py-4 text-lg bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <Button 
                onClick={handleLogin} 
                loading={loading} 
                className="w-full py-4 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 rounded-xl transition-all transform hover:-translate-y-0.5"
              >
                Acessar Conta
              </Button>

              <div className="pt-8 text-center border-t border-slate-200 mt-8">
                  <a 
                    href="https://wa.me/5511999999999"
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <MessageCircle size={18} /> Precisa de ajuda? Fale com o Suporte
                  </a>
              </div>
            </div>
          </div>
        </div>

      </div>
      <div className="absolute bottom-4 w-full text-center text-slate-400 text-xs font-medium">
        Criado por <strong>MecDEVs</strong>
      </div>
    </div>
  );
};

// NOVA PÁGINA DE CONFIGURAÇÕES PROFISSIONAL
const PaginaConfig = ({ config, onSave }) => {
  const [meta, setMeta] = useState(config?.metaDiaria || 1000);
  const [nome, setNome] = useState(config?.nomeEmpresa || "Minha Loja");
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null); // Para o alerta de sucesso

  const salvar = async () => {
    setLoading(true);
    try {
      await onSave({ metaDiaria: Number(meta), nomeEmpresa: nome });
      setAlertInfo({ title: 'Sucesso', message: 'Configurações atualizadas com sucesso.', type: 'success' });
    } catch (e) {
      setAlertInfo({ title: 'Erro', message: 'Falha ao salvar configurações.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <AlertModal isOpen={!!alertInfo} onClose={() => setAlertInfo(null)} title={alertInfo?.title} message={alertInfo?.message} type={alertInfo?.type} />
      
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configurações</h2>
        <p className="text-slate-500">Gerencie os detalhes da sua empresa e preferências.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         {/* Menu Lateral de Config */}
         <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-medium text-sm border border-blue-100">Geral</button>
            <button className="w-full text-left px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 font-medium text-sm transition-colors">Usuários (Em breve)</button>
            <button className="w-full text-left px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 font-medium text-sm transition-colors">Integrações (Em breve)</button>
         </div>

         {/* Conteúdo */}
         <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100">Informações Básicas</h3>
              <div className="space-y-6">
                <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-700">Nome da Empresa</label>
                   <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Mercado Silva" />
                   <p className="text-xs text-slate-400 mt-1">Este nome aparecerá no topo do painel e nos relatórios.</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100 flex items-center gap-2">
                 <Target size={20} className="text-indigo-500"/> Metas e Objetivos
              </h3>
              <div className="space-y-6">
                <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-700">Meta Diária de Vendas (R$)</label>
                   <div className="relative">
                      <span className="absolute left-4 top-3.5 text-slate-400 font-bold">R$</span>
                      <Input type="number" value={meta} onChange={e => setMeta(e.target.value)} className="pl-12" />
                   </div>
                   <p className="text-xs text-slate-400 mt-1">Usado para calcular o progresso no painel de vendas.</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
               <Button onClick={salvar} loading={loading} variant="accent" className="px-8">Salvar Alterações</Button>
            </div>
         </div>
      </div>
    </div>
  );
};

// Ícone extra necessário
const Target = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);

// ... (Produtos, Vendas, Relatorios, Caixa, Dashboard - Mantidos iguais ao anterior)

const PaginaProdutos = ({ produtos, carregarDados, userUid }) => {
  const [loading, setLoading] = useState(false);
  const [novoProduto, setNovoProduto] = useState({ nome: '', precoCusto: '', precoVenda: '', estoque: '', validade: '' });
  const [produtoParaExcluir, setProdutoParaExcluir] = useState(null);
  const [produtoParaAjustar, setProdutoParaAjustar] = useState(null);
  const [sugestoes, setSugestoes] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const handleNomeChange = (e) => {
    const valor = e.target.value;
    setNovoProduto({ ...novoProduto, nome: valor });
    if (valor.length > 1) {
      setSugestoes(SUGESTOES_PADRAO.filter(item => item.toLowerCase().includes(valor.toLowerCase())).slice(0, 5));
      setMostrarSugestoes(true);
    } else { setMostrarSugestoes(false); }
  };

  const adicionarProduto = async (e) => {
    e.preventDefault();
    if (!novoProduto.nome) return;
    setLoading(true); 
    try {
      await api.produtos.criar(userUid, { ...novoProduto, precoCusto: parseFloat(novoProduto.precoCusto), precoVenda: parseFloat(novoProduto.precoVenda), estoque: parseInt(novoProduto.estoque) });
      await carregarDados();
      setNovoProduto({ nome: '', precoCusto: '', precoVenda: '', estoque: '', validade: '' });
    } catch (error) { alert(`Erro: ${error.message}`); } finally { setLoading(false); }
  };

  const salvarAjusteEstoque = async (id, qtd) => {
    const prod = produtos.find(p => p.id === id);
    if(prod) await api.produtos.update(userUid, id, { estoque: (prod.estoque||0) + qtd });
    await carregarDados();
    setProdutoParaAjustar(null);
  };

  const confirmarExclusao = async () => {
     if(produtoParaExcluir) { await api.produtos.excluir(userUid, produtoParaExcluir); await carregarDados(); setProdutoParaExcluir(null); }
  };

  return (
    <div className="space-y-8">
      <ConfirmationModal isOpen={!!produtoParaExcluir} onClose={() => setProdutoParaExcluir(null)} onConfirm={confirmarExclusao} title="Excluir" message="Tem certeza?" />
      <StockModal isOpen={!!produtoParaAjustar} onClose={() => setProdutoParaAjustar(null)} onSave={salvarAjusteEstoque} produto={produtoParaAjustar} />
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative z-20">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Plus className="bg-blue-100 text-blue-600 p-1.5 rounded-lg" size={28} /> Adicionar Novo Produto</h2>
        <form onSubmit={adicionarProduto} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          <div className="md:col-span-4 relative">
             <Input label="Nome do Produto" value={novoProduto.nome} onChange={handleNomeChange} onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)} required />
             {mostrarSugestoes && sugestoes.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white border rounded-xl shadow-xl z-50">
                {sugestoes.map((s, i) => <div key={i} onClick={() => { setNovoProduto({...novoProduto, nome: s}); setMostrarSugestoes(false); }} className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 text-sm">{s}</div>)}
              </div>
             )}
          </div>
          <div className="md:col-span-2"><Input label="Custo" type="number" step="0.01" value={novoProduto.precoCusto} onChange={e => setNovoProduto({...novoProduto, precoCusto: e.target.value})} required /></div>
          <div className="md:col-span-2"><Input label="Venda" type="number" step="0.01" value={novoProduto.precoVenda} onChange={e => setNovoProduto({...novoProduto, precoVenda: e.target.value})} required /></div>
          <div className="md:col-span-2"><Input label="Estoque" type="number" value={novoProduto.estoque} onChange={e => setNovoProduto({...novoProduto, estoque: e.target.value})} required /></div>
          <div className="md:col-span-2"><Input label="Validade" type="date" value={novoProduto.validade} onChange={e => setNovoProduto({...novoProduto, validade: e.target.value})} required /></div>
          <div className="md:col-span-12 flex justify-end"><Button type="submit" variant="accent" loading={loading}>Salvar</Button></div>
        </form>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500">
            <tr><th className="px-6 py-4 text-left">Produto</th><th className="px-6 py-4 text-right">Venda</th><th className="px-6 py-4 text-center">Validade</th><th className="px-6 py-4 text-center">Estoque</th><th className="px-6 py-4 text-center">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {produtos.map(p => (
              <tr key={p.id} className="hover:bg-blue-50/50">
                <td className="px-6 py-4 font-bold text-slate-700">{p.nome}</td>
                <td className="px-6 py-4 text-right text-slate-700">R$ {p.precoVenda.toFixed(2)}</td>
                <td className="px-6 py-4 text-center text-slate-500 text-xs font-semibold">{formatDate(p.validade)}</td>
                <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded-md font-bold text-xs ${p.estoque < 10 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{p.estoque} un</span></td>
                <td className="px-6 py-4 text-center flex justify-center gap-2">
                   <button onClick={() => setProdutoParaAjustar(p)} className="p-2 text-slate-400 hover:text-blue-600"><ArrowRightLeft size={18} /></button>
                   <button onClick={() => setProdutoParaExcluir(p.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PaginaVendas = ({ produtos, carregarDados, userUid, config }) => {
  const [loading, setLoading] = useState(false);
  const [produtoId, setProdutoId] = useState('');
  const [qtd, setQtd] = useState(1);
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0]);
  const [alertInfo, setAlertInfo] = useState(null); 

  // Calcula vendas de hoje (Filtrando as vendas reais para somar no progresso)
  // Nota: Em app real, isso viria do estado 'vendas' filtrado por data.
  // Aqui, para a barra encher, precisamos das vendas carregadas. Vamos assumir que 'vendas' está disponível no componente pai
  // e que passamos como prop (veja App component). 
  // Como este componente não recebe 'vendas', vamos simplificar e mostrar o subtotal atual no card.

  const produto = produtos.find(p => p.id === produtoId);
  const subtotal = produto ? (produto.precoVenda * qtd) : 0;

  const registrar = async (e) => {
    e.preventDefault();
    if (!produto || produto.estoque < qtd) return setAlertInfo({ title: 'Estoque Insuficiente', message: 'Quantidade indisponível.', type: 'error' });
    setLoading(true);
    try {
      const [a, m, d] = dataVenda.split('-');
      await api.vendas.criar(userUid, { produtoId: produto.id, produto: produto.nome, qtd: parseInt(qtd), total: subtotal, custoTotal: produto.precoCusto * qtd, data: `${d}/${m}/${a}` });
      await api.produtos.update(userUid, produto.id, { estoque: produto.estoque - parseInt(qtd) });
      await carregarDados();
      setQtd(1); setProdutoId('');
      setAlertInfo({ title: 'Sucesso', message: 'Venda registrada.', type: 'success' });
    } catch (err) { setAlertInfo({ title: 'Erro', message: 'Falha ao registrar.', type: 'error' }); } finally { setLoading(false); }
  };
  
  const meta = config?.metaDiaria || 1000;
  const progresso = Math.min(100, (subtotal / meta) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      <AlertModal isOpen={!!alertInfo} onClose={() => setAlertInfo(null)} title={alertInfo?.title} message={alertInfo?.message} type={alertInfo?.type} />
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
          <h2 className="text-xl font-bold text-slate-800 mb-8 pb-4 border-b border-slate-100">Registrar Venda</h2>
          <form onSubmit={registrar} className="space-y-6 flex-1">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Selecione o Produto</label>
              <select className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-lg outline-none" value={produtoId} onChange={e => setProdutoId(e.target.value)} required>
                <option value="">Clique para selecionar...</option>
                {produtos.map(p => (<option key={p.id} value={p.id} disabled={p.estoque === 0}>{p.nome} • R$ {p.precoVenda.toFixed(2)}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-6">
               <Input label="Data da Venda" type="date" value={dataVenda} onChange={e => setDataVenda(e.target.value)} required />
               <Input label="Qtd" type="number" min="1" value={qtd} onChange={e => setQtd(e.target.value)} required />
            </div>
            <div className="bg-slate-900 p-6 rounded-xl flex justify-between items-center text-white mt-auto shadow-xl shadow-slate-900/10">
               <div>
                  <span className="text-slate-400 text-xs uppercase tracking-widest">Total a Receber</span>
                  <div className="text-3xl font-bold text-emerald-400">R$ {subtotal.toFixed(2)}</div>
               </div>
               <Button type="submit" variant="accent" disabled={!produto} loading={loading} className="px-8 py-4 text-base">Finalizar</Button>
            </div>
          </form>
        </div>
      </div>
      <div className="space-y-6">
         <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-xl shadow-blue-900/20">
           <div className="flex justify-between items-end mb-2">
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">Meta Diária</p>
              <p className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded">Alvo: R$ {meta}</p>
           </div>
           <div className="text-4xl font-bold mb-2">R$ {subtotal.toFixed(2)}</div> 
           <p className="text-xs text-blue-200 opacity-80 mb-4">Valor desta venda (simulação)</p>
           <div className="w-full bg-blue-900/30 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${progresso}%` }}></div>
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ShoppingCart size={18} className="text-slate-400"/> Dicas de Venda</h3>
           <div className="space-y-4 text-sm text-slate-500">
             <p>• Ofereça produtos próximos ao vencimento com desconto.</p>
             <p>• Lembre-se de conferir o estoque antes de finalizar grandes volumes.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

const PaginaRelatorios = ({ vendas }) => {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtro, setFiltro] = useState('7dias');

  // Helper para formatar YYYY-MM-DD usando hora local
  const formatDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const aplicarFiltroRapido = (tipo) => {
    setFiltro(tipo);
    const hoje = new Date(); 
    const inicio = new Date();

    if (tipo === 'todos') {
       setDataInicio('');
       setDataFim('');
       return;
    }

    if (tipo === 'hoje') {
       // inicio é hoje mesmo
    } else if (tipo === '7dias') {
      inicio.setDate(hoje.getDate() - 7);
    } else if (tipo === '30dias') {
      inicio.setDate(hoje.getDate() - 30);
    }
    
    if (tipo !== 'personalizado') {
      setDataInicio(formatDateInput(inicio)); 
      setDataFim(formatDateInput(hoje));
    }
  };

  const dadosFiltrados = useMemo(() => {
    if (filtro === 'todos' || (!dataInicio && !dataFim)) return vendas;
    if ((filtro === 'personalizado' && (!dataInicio || !dataFim))) return vendas;
    
    const [ia, im, id] = dataInicio.split('-').map(Number);
    const inicio = new Date(ia, im - 1, id);
    inicio.setHours(0,0,0,0);

    const [fa, fm, fd] = dataFim.split('-').map(Number);
    const fim = new Date(fa, fm - 1, fd);
    fim.setHours(23,59,59,999);
    
    return vendas.filter(v => { 
      const d = parseDate(v.data); 
      if (isNaN(d.getTime())) return false;
      return d >= inicio && d <= fim; 
    });
  }, [vendas, dataInicio, dataFim, filtro]);

  const totais = dadosFiltrados.reduce((acc, v) => ({ faturamento: acc.faturamento + v.total, qtd: acc.qtd + v.qtd }), { faturamento: 0, qtd: 0 });
  
  return (
    <div className="space-y-8">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><List className="text-blue-500"/> Relatório de Desempenho</h2>
        <div className="flex flex-wrap items-center gap-2">
           <button onClick={() => aplicarFiltroRapido('todos')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filtro === 'todos' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              Todos
           </button>
           {['hoje', '7dias', '30dias'].map(f => (
              <button key={f} onClick={() => aplicarFiltroRapido(f)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filtro === f ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {f === 'hoje' ? 'Hoje' : f === '7dias' ? '7 Dias' : '30 Dias'}
              </button>
           ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Faturamento do Período" value={`R$ ${totais.faturamento.toFixed(2)}`} icon={DollarSign} trend="up" />
        <Card title="Volume de Vendas" value={`${totais.qtd} itens`} icon={Package} trend="down" />
      </div>
      {/* TABELA DETALHADA RESTAURADA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100"><h3 className="font-bold text-slate-800">Extrato Detalhado</h3></div>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500"><tr><th className="px-6 py-4 text-left">Data</th><th className="px-6 py-4 text-left">Produto</th><th className="px-6 py-4 text-right">Valor</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
             {dadosFiltrados.map(v => (
               <tr key={v.id} className="hover:bg-blue-50/50"><td className="px-6 py-4 text-slate-500">{v.data}</td><td className="px-6 py-4 font-bold text-slate-700">{v.produto} ({v.qtd}x)</td><td className="px-6 py-4 text-right text-emerald-600 font-bold">R$ {v.total.toFixed(2)}</td></tr>
             ))}
             {dadosFiltrados.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-slate-400">Nenhuma venda encontrada neste período.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PaginaDashboard = ({ produtos, vendas, onUpdateProduto }) => {
   const [produtoParaPromocao, setProdutoParaPromocao] = useState(null);

   const handleSavePromotion = async (id, novoPreco) => {
       // Encontra o produto para obter o preço original se não existir
       const prod = produtos.find(p => p.id === id);
       const precoOriginal = prod.precoOriginal || prod.precoVenda;
       
       await onUpdateProduto(id, { 
           precoVenda: novoPreco, 
           emPromocao: true,
           precoOriginal: precoOriginal
       });
       setProdutoParaPromocao(null);
   };

   const analytics = useMemo(() => {
     const hoje = new Date();
     hoje.setHours(0,0,0,0);
     const sugestoes = produtos.map(p => {
       // Correção na criação da data de validade para evitar problemas de fuso
       const parts = p.validade.split('-');
       const dataValidade = new Date(parts[0], parts[1]-1, parts[2]);
       
       const diffTime = dataValidade - hoje;
       const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
       let status = 'ok';
       if (diasRestantes < 0) status = 'vencido'; else if (diasRestantes === 0) status = 'hoje'; else if (diasRestantes <= 10) status = 'critico'; else if (diasRestantes <= 30) status = 'atencao';
       return { ...p, diasRestantes, status };
     }).filter(p => p.status !== 'ok');
     const totalFat = vendas.reduce((acc, i) => acc + i.total, 0);
     return { totalFat, sugestoes };
   }, [produtos, vendas]);

   return (
     <div className="space-y-8">
       <PromotionModal 
          isOpen={!!produtoParaPromocao}
          onClose={() => setProdutoParaPromocao(null)}
          produto={produtoParaPromocao}
          onSave={handleSavePromotion}
       />

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card title="Faturamento Total" value={`R$ ${analytics.totalFat.toFixed(2)}`} icon={DollarSign} trend="up" />
         <Card title="Produtos Ativos" value={produtos.length} icon={Package} trend="up" />
         <Card title="Alertas de Validade" value={analytics.sugestoes.length} icon={AlertTriangle} trend={analytics.sugestoes.length > 0 ? 'down' : 'up'} />
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Tag size={18} className="text-amber-500"/> Atenção: Produtos a Vencer</h3>
          </div>
          {analytics.sugestoes.length === 0 ? (
             <div className="text-center py-12 text-slate-400">
               <CheckCircle size={48} className="mx-auto mb-3 text-emerald-200"/>
               Tudo certo! Nenhum produto em risco.
             </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {analytics.sugestoes.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-12 rounded-full ${p.status === 'vencido' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                    <div>
                      <h4 className="font-bold text-slate-700">{p.nome}</h4>
                      <div className="flex flex-col gap-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded w-fit ${p.status === 'vencido' ? 'text-rose-600 bg-rose-100' : 'text-amber-600 bg-amber-100'}`}>
                            {p.status === 'vencido' ? `Venceu há ${Math.abs(p.diasRestantes)} dias` : p.status === 'hoje' ? 'VENCE HOJE!' : `Vence em ${p.diasRestantes} dias`}
                          </span>
                          
                          {/* Price Display Logic */}
                          {p.emPromocao && (
                              <div className="text-xs flex items-center gap-2 mt-1">
                                  <span className="text-slate-400 line-through">R$ {(p.precoOriginal || p.precoVenda).toFixed(2)}</span>
                                  <ArrowRightLeft size={10} className="text-slate-300" />
                                  <span className="text-emerald-600 font-bold text-sm">R$ {p.precoVenda.toFixed(2)}</span>
                              </div>
                          )}
                      </div>
                    </div>
                  </div>
                  {/* Lógica Visual de Confirmação */}
                  {p.emPromocao ? (
                      <div className="flex flex-col items-end gap-1">
                        <Badge type="success">Promoção Ativa</Badge>
                        <button 
                          onClick={() => setProdutoParaPromocao(p)}
                          className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                        >
                          <Edit size={12} /> Editar
                        </button>
                      </div>
                  ) : (
                      <Button 
                        variant="secondary" 
                        className="text-xs py-1.5 px-3"
                        onClick={() => setProdutoParaPromocao(p)}
                      >
                        Criar Promoção
                      </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
     </div>
   );
};

const PaginaCaixa = ({ vendas, carregarDados, userUid, produtos }) => {
  const [vendaParaExcluir, setVendaParaExcluir] = useState(null);
  const [vendaParaEditar, setVendaParaEditar] = useState(null);
  const bruto = vendas.reduce((acc, v) => acc + v.total, 0);

  const handleDelete = async () => {
    if (vendaParaExcluir) {
      const venda = vendas.find(v => v.id === vendaParaExcluir);
      if (venda) {
         const prod = produtos.find(p => p.id === venda.produtoId);
         if(prod) await api.produtos.update(userUid, prod.id, { estoque: prod.estoque + venda.qtd });
      }
      await api.vendas.excluir(userUid, vendaParaExcluir);
      await carregarDados();
      setVendaParaExcluir(null);
    }
  };

  const handleEdit = async (id, novosDados) => {
    await api.vendas.atualizar(userUid, id, novosDados);
    await carregarDados();
    setVendaParaEditar(null);
  };

  return (
    <div className="space-y-8">
      <ConfirmationModal isOpen={!!vendaParaExcluir} onClose={() => setVendaParaExcluir(null)} onConfirm={handleDelete} title="Excluir Venda" message="Deseja excluir esta venda? O estoque será devolvido automaticamente." />
      <EditSaleModal isOpen={!!vendaParaEditar} onClose={() => setVendaParaEditar(null)} onSave={handleEdit} venda={vendaParaEditar} />
      
      <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl shadow-slate-900/20 flex justify-between items-center relative overflow-hidden">
         <div className="relative z-10">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">Saldo em Caixa</p>
            <p className="text-5xl font-bold text-emerald-400">R$ {bruto.toFixed(2)}</p>
         </div>
         <div className="relative z-10 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
            <DollarSign size={40} />
         </div>
         {/* Abstract bg */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -mr-16 -mt-16"></div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-700 bg-slate-50/50">Movimentações Recentes</div>
        <table className="min-w-full text-sm">
          <thead className="bg-white text-slate-400 uppercase text-xs">
            <tr><th className="px-6 py-3 text-left">Data</th><th className="px-6 py-3 text-left">Descrição</th><th className="px-6 py-3 text-right">Valor</th><th className="px-6 py-3 text-center">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {vendas.map(v => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-slate-500">{v.data}</td>
                <td className="px-6 py-3 font-medium text-slate-700">Venda: {v.produto} <span className="text-slate-400 text-xs">({v.qtd} un)</span></td>
                <td className="px-6 py-3 text-right text-emerald-600 font-bold">+ R$ {v.total.toFixed(2)}</td>
                <td className="px-6 py-3 text-center flex justify-center gap-2">
                  <button onClick={() => setVendaParaEditar(v)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16} /></button>
                  <button onClick={() => setVendaParaExcluir(v.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {vendas.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-400">Nenhuma venda registrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(false);
  const [userUid, setUserUid] = useState(null);
  const [config, setConfig] = useState({ metaDiaria: 1000, nomeEmpresa: "Minha Loja" });
  const [paginaAtual, setPaginaAtual] = useState('dashboard');
  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [loadingInicial, setLoadingInicial] = useState(false);

  const carregarDados = async (uid) => {
    const targetUid = uid || userUid;
    if (!targetUid) return;
    const p = await api.produtos.listar(targetUid);
    const v = await api.vendas.listar(targetUid);
    const c = await api.config.get(targetUid); // Carrega config
    setProdutos(p);
    setVendas(v);
    setConfig(c);
  };
  
  // Nova função para atualizar produto (usada pela promoção)
  const atualizarProduto = async (id, novosDados) => {
    if (!userUid) return;
    await api.produtos.update(userUid, id, novosDados);
    await carregarDados(userUid); // Recarrega para refletir a mudança
  };

  useEffect(() => {
    const unsubscribe = api.auth.onStateChanged((user) => {
      if (user) {
        setUserUid(user.uid);
        // Carregamos o nome da empresa do banco, se existir
        api.config.get(user.uid).then(cfg => setConfig(cfg));
        
        setUsuarioLogado(true);
        setLoadingInicial(true);
        carregarDados(user.uid).finally(() => setLoadingInicial(false));
      } else {
        setUsuarioLogado(false);
        setUserUid(null);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!usuarioLogado) return <PaginaLogin onLogin={(user, nome) => { 
    setUserUid(user.user.uid); 
    setUsuarioLogado(true); 
    carregarDados(user.user.uid);
  }} />;

  if (loadingInicial) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row">
      <Sidebar setPagina={setPaginaAtual} paginaAtual={paginaAtual} onLogout={() => { api.auth.logout(); setUsuarioLogado(false); }} />
      <main className="flex-1 h-screen overflow-y-auto p-4 md:p-8 animate-fade-in-up">
        <div className="max-w-7xl mx-auto">
          {/* Passamos 'config' e a função de salvar para as páginas */}
          <div className="mb-6 flex justify-between items-end">
             <div>
               <h1 className="text-2xl font-bold text-slate-800">{config.nomeEmpresa}</h1>
               <p className="text-slate-500 text-sm">Painel de Controle</p>
             </div>
             <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase">Data</p>
                <p className="text-sm font-medium text-slate-700">{new Date().toLocaleDateString()}</p>
             </div>
          </div>

          {paginaAtual === 'dashboard' && <PaginaDashboard produtos={produtos} vendas={vendas} onUpdateProduto={atualizarProduto} />}
          {paginaAtual === 'produtos' && <PaginaProdutos produtos={produtos} carregarDados={() => carregarDados(userUid)} userUid={userUid} />}
          {paginaAtual === 'vendas' && <PaginaVendas produtos={produtos} carregarDados={() => carregarDados(userUid)} vendas={vendas} userUid={userUid} config={config} />}
          {paginaAtual === 'relatorios' && <PaginaRelatorios vendas={vendas} />}
          {paginaAtual === 'caixa' && <PaginaCaixa vendas={vendas} carregarDados={() => carregarDados(userUid)} userUid={userUid} produtos={produtos} />}
          
          {/* Nova Página de Configuração */}
          {paginaAtual === 'configuracoes' && (
            <PaginaConfig 
              config={config} 
              onSave={async (newConfig) => {
                 await api.config.save(userUid, newConfig);
                 setConfig(newConfig);
              }} 
            />
          )}
        </div>
      </main>
    </div>
  );
}