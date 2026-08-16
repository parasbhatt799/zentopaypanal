import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, CheckCircle2, ShieldCheck, Zap, Receipt, AlertCircle, Sparkles, ArrowRight, Phone, Flame, Droplets, Tv, Wifi, Car, DollarSign, Clock, XCircle, Search, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { CreditCardBill } from '../types';
import bharatConnectLogo from '../assets/bharat connect.svg';

const PRESET_CC_BILLERS = [
  {
    biller_id: "HDFCCARD00001",
    biller_name: "HDFC Bank Credit Card",
    category: "Credit Card",
    metadata: {
      billerInputParams: {
        paramInfo: [
          { paramName: "Last 4 Digits of Card Number", dataType: "NUMERIC", isOptional: "false" },
          { paramName: "Mobile Number", dataType: "NUMERIC", isOptional: "false" }
        ]
      }
    }
  },
  {
    biller_id: "SBICARD000001",
    biller_name: "SBI Card",
    category: "Credit Card",
    metadata: {
      billerInputParams: {
        paramInfo: [
          { paramName: "Last 4 Digits of Card Number", dataType: "NUMERIC", isOptional: "false" },
          { paramName: "Mobile Number", dataType: "NUMERIC", isOptional: "false" }
        ]
      }
    }
  },
  {
    biller_id: "ICICICARD0001",
    biller_name: "ICICI Bank Credit Card",
    category: "Credit Card",
    metadata: {
      billerInputParams: {
        paramInfo: [
          { paramName: "Last 4 Digits of Card Number", dataType: "NUMERIC", isOptional: "false" },
          { paramName: "Mobile Number", dataType: "NUMERIC", isOptional: "false" }
        ]
      }
    }
  },
  {
    biller_id: "AXISCARD00001",
    biller_name: "Axis Bank Credit Card",
    category: "Credit Card",
    metadata: {
      billerInputParams: {
        paramInfo: [
          { paramName: "Last 4 Digits of Card Number", dataType: "NUMERIC", isOptional: "false" },
          { paramName: "Mobile Number", dataType: "NUMERIC", isOptional: "false" }
        ]
      }
    }
  },
  {
    biller_id: "BOBCARD000001",
    biller_name: "BOB Card",
    category: "Credit Card",
    metadata: {
      billerInputParams: {
        paramInfo: [
          { paramName: "Last 4 Digits of Card Number", dataType: "NUMERIC", isOptional: "false" },
          { paramName: "Mobile Number", dataType: "NUMERIC", isOptional: "false" }
        ]
      }
    }
  }
];

export const parsePaymentMethod = (paymentMethodStr: string) => {
  if (paymentMethodStr && paymentMethodStr.includes('|')) {
    const parts = paymentMethodStr.split('|');
    return {
      method: parts[0] || 'UPI / NetBanking',
      billerId: parts[1] || 'N/A',
      mobile: parts[2] || 'N/A'
    };
  }
  return {
    method: paymentMethodStr || 'UPI / NetBanking',
    billerId: 'N/A',
    mobile: 'N/A'
  };
};

const getBillerLogoUrl = (billerName: string): string | null => {
  const name = billerName.toLowerCase();
  if (name.includes('au bank') || name.includes('au credit')) return '/logos/au-BGK_wavr.png';
  if (name.includes('axis bank') || name.includes('axis credit')) return '/logos/axis-Bgg9b_RG.png';
  if (name.includes('bandhan bank') || name.includes('bandhan credit')) return '/logos/bandhan-BuQvAAD6.png';
  if (name.includes('bob ') || name.includes('baroda') || name.includes(' baroda credit')) return '/logos/bob-B2dAmJmD.png';
  if (name.includes('boi ') || name.includes('bank of india') || name.includes('india credit')) return '/logos/boi-Bl_oOHHB.png';
  if (name.includes('canara bank') || name.includes('canara credit')) return '/logos/canara-B_SbmPQP.png';
  if (name.includes('csb bank') || name.includes('csb credit')) return '/logos/csb-fV039-_h.png';
  if (name.includes('cub ') || name.includes('city union')) return '/logos/cub-TxFJ1Tcf.png';
  if (name.includes('dcb bank') || name.includes('dcb credit')) return '/logos/dcb-BnT3YcoN.png';
  if (name.includes('dhanlaxmi')) return '/logos/dhanlaxmi-DNA2nyHB.png';
  if (name.includes('esaf')) return '/logos/esaf-BkaOrpfd.png';
  if (name.includes('federal')) return '/logos/federal-BnCPtS-j.png';
  if (name.includes('icici')) return '/logos/icici-CKAaLXKZ.png';
  if (name.includes('idbi')) return '/logos/idbi-D8cZhPna.png';
  if (name.includes('idfc')) return '/logos/idfc-CjnEwPR2.png';
  if (name.includes('indian bank') || name.includes('indian credit')) return '/logos/indian-D1O-TGLU.png';
  if (name.includes('indusind')) return '/logos/indusind-rqfG5HZW.png';
  if (name.includes('iob') || name.includes('indian overseas')) return '/logos/iob-FqU0i4qX.png';
  if (name.includes('j&k') || name.includes('jammu')) return '/logos/jk-C7QAtwmv.png';
  if (name.includes('onecard') || name.includes('one card')) return '/logos/onecard-CITcK--6.png';
  if (name.includes('pnb') || name.includes('punjab national')) return '/logos/pnb-wpl37PgL.png';
  if (name.includes('saraswat')) return '/logos/saraswat-Dg8KuoYA.png';
  if (name.includes('sbi') || name.includes('state bank') || name.includes('sbi card')) return '/logos/sbi-CY222kpF.png';
  if (name.includes('sbm')) return '/logos/sbm-CI_ofwN1.png';
  if (name.includes('sib ') || name.includes('south indian')) return '/logos/sib-CpcsoE2c.png';
  if (name.includes('suryoday')) return '/logos/suryoday-yRkb8y82.png';
  if (name.includes('tmb ') || name.includes('tamilnad')) return '/logos/tmb-Bkt_cjAZ.png';
  if (name.includes('union bank') || name.includes('union credit')) return '/logos/union-Cqvrgp0_.png';
  return null;
};

export const CreditCardBillPay: React.FC = () => {
  const { currentUser, bills, payBill, theme } = useAuth();

  const PRESET_CATEGORIES = [
    "Credit Card",
    "Electricity",
    "Mobile Postpaid",
    "Mobile Prepaid",
    "LPG Gas",
    "Gas",
    "Water",
    "DTH",
    "Broadband Postpaid",
    "Landline Postpaid",
    "Fastag",
    "Loan Repayment",
    "Insurance",
    "Cable TV",
    "EV Recharge",
    "Fleet Card Recharge",
    "Education Fees",
    "Housing Society",
    "Municipal Services",
    "Municipal Taxes",
    "NCMC Recharge",
    "National Pension System",
    "Prepaid Meter",
    "Rental",
    "Subscription",
    "Clubs and Associations",
    "Donation",
    "Forex",
    "Agent Collection",
    "eChallan"
  ];

  const [categories, setCategories] = useState<string[]>(PRESET_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [billers, setBillers] = useState<any[]>(PRESET_CC_BILLERS);
  const [selectedBiller, setSelectedBiller] = useState<any>(PRESET_CC_BILLERS[0]);

  // Dynamic fields state
  const [paramValues, setParamValues] = useState<Record<string, string>>({
    'Last 4 Digits of Card Number': '8821',
    'Mobile Number': currentUser?.phone || '9876543210'
  });

  const [amount, setAmount] = useState<string>('12500');
  const [cardholderName, setCardholderName] = useState(currentUser?.full_name || 'Rajkumar Sharma');
  const paymentMethod = 'UPI Instant Direct';

  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingBill, setIsFetchingBill] = useState(false);
  const [fetchedBill, setFetchedBill] = useState<any>(null);

  const [receiptBill, setReceiptBill] = useState<CreditCardBill | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Biller Searchable Dropdown States
  const [billerDropdownOpen, setBillerDropdownOpen] = useState(false);
  const [billerSearchQuery, setBillerSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setBillerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredBillersList = billers.filter(b =>
    b.biller_name.toLowerCase().includes(billerSearchQuery.toLowerCase())
  );

  // T-PIN Verification States
  const [showTpinModal, setShowTpinModal] = useState(false);
  const [enteredTpin, setEnteredTpin] = useState('');
  const [tpinModalError, setTpinModalError] = useState('');

  const [banners, setBanners] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState<number>(0);

  const savedCardsPreset = [
    { bank: 'HDFC Regalia Gold', number: '4532••••••••8821', holder: currentUser?.full_name || 'Rajkumar Sharma' },
    { bank: 'ICICI Rubyx MasterCard', number: '5241••••••••1049', holder: currentUser?.full_name || 'Rajkumar Sharma' },
    { bank: 'SBI SimplyClick', number: '4111••••••••9012', holder: currentUser?.full_name || 'Rajkumar Sharma' },
  ];

  const userBills = bills.filter((b) => b.user_id === currentUser?.id);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Success' | 'Pending' | 'Failed'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom' | 'all'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Date range match helper
  const checkDateMatch = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    if (dateFilter === 'today') {
      return date >= todayStart && date <= todayEnd;
    }
    if (dateFilter === 'yesterday') {
      return date >= yesterdayStart && date <= yesterdayEnd;
    }
    if (dateFilter === 'last7') {
      const last7Start = new Date(todayStart);
      last7Start.setDate(last7Start.getDate() - 7);
      return date >= last7Start;
    }
    if (dateFilter === 'last30') {
      const last30Start = new Date(todayStart);
      last30Start.setDate(last30Start.getDate() - 30);
      return date >= last30Start;
    }
    if (dateFilter === 'thisMonth') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= monthStart;
    }
    if (dateFilter === 'custom') {
      if (!startDate) return true;
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate + 'T23:59:59.999') : todayEnd;
      return date >= start && date <= end;
    }
    return true; // all time
  };

  // Filter bills
  const filteredUserBills = userBills.filter((b) => {
    const parsed = parsePaymentMethod(b.payment_method);
    const matchesSearch =
      b.transaction_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.card_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parsed.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parsed.billerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parsed.mobile.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.amount.toString().includes(searchTerm) ||
      b.status.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesDate = checkDateMatch(b.created_at);

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getParamInfoList = (biller: any): any[] => {
    if (!biller) return [];
    let meta = biller.metadata;
    if (typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch (e) {
        return [];
      }
    }
    const info = meta?.billerInputParams?.paramInfo;
    if (!info) return [];
    if (Array.isArray(info)) return info;
    return [info];
  };

  const getShortLabel = (name: string) => {
    const clean = name.toLowerCase();
    if (clean.includes('last 4 digit') || clean.includes('card number')) {
      return 'Last 4 Digits of Card';
    }
    if (clean.includes('registered mobile') || clean.includes('mobile number')) {
      return 'Mobile Number';
    }
    return name;
  };

  const getCategoryIcon = (category: string) => {
    const clean = category.toLowerCase();
    if (clean.includes('card')) return CreditCard;
    if (clean.includes('elect')) return Zap;
    if (clean.includes('phone') || clean.includes('mobile')) return Phone;
    if (clean.includes('gas') || clean.includes('flame') || clean.includes('lpg')) return Flame;
    if (clean.includes('water')) return Droplets;
    if (clean.includes('dth') || clean.includes('tv')) return Tv;
    if (clean.includes('broadband') || clean.includes('wifi')) return Wifi;
    if (clean.includes('fastag') || clean.includes('car')) return Car;
    if (clean.includes('loan') || clean.includes('repay')) return DollarSign;
    return Receipt;
  };

  const CATEGORY_THEMES: Record<string, { bg: string; border: string; text: string; active: string; icon: string }> = {
    "Credit Card": {
      bg: "bg-blue-50 dark:bg-blue-950/20",
      border: "border-blue-200/60 dark:border-blue-900/30",
      text: "text-blue-700 dark:text-blue-300",
      icon: "text-blue-500 dark:text-blue-400",
      active: "bg-blue-100/80 dark:bg-blue-600/25 border-blue-500 text-blue-800 dark:text-blue-200 shadow-blue-500/10"
    },
    "Electricity": {
      bg: "bg-amber-50 dark:bg-amber-950/20",
      border: "border-amber-200/60 dark:border-amber-900/30",
      text: "text-amber-700 dark:text-amber-300",
      icon: "text-amber-500 dark:text-amber-400",
      active: "bg-amber-100/80 dark:bg-amber-600/25 border-amber-500 text-amber-800 dark:text-amber-200 shadow-amber-500/10"
    },
    "Mobile Postpaid": {
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      border: "border-emerald-200/60 dark:border-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-300",
      icon: "text-emerald-500 dark:text-emerald-400",
      active: "bg-emerald-100/80 dark:bg-emerald-600/25 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-emerald-500/10"
    },
    "Mobile Prepaid": {
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      border: "border-emerald-200/60 dark:border-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-300",
      icon: "text-emerald-500 dark:text-emerald-400",
      active: "bg-emerald-100/80 dark:bg-emerald-600/25 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-emerald-500/10"
    },
    "LPG Gas": {
      bg: "bg-rose-50 dark:bg-rose-950/20",
      border: "border-rose-200/60 dark:border-rose-900/30",
      text: "text-rose-700 dark:text-rose-300",
      icon: "text-rose-500 dark:text-rose-400",
      active: "bg-rose-100/80 dark:bg-rose-600/25 border-rose-500 text-rose-800 dark:text-rose-200 shadow-rose-500/10"
    },
    "Gas": {
      bg: "bg-rose-50 dark:bg-rose-950/20",
      border: "border-rose-200/60 dark:border-rose-900/30",
      text: "text-rose-700 dark:text-rose-300",
      icon: "text-rose-500 dark:text-rose-400",
      active: "bg-rose-100/80 dark:bg-rose-600/25 border-rose-500 text-rose-800 dark:text-rose-200 shadow-rose-500/10"
    },
    "Water": {
      bg: "bg-sky-50 dark:bg-sky-950/20",
      border: "border-sky-200/60 dark:border-sky-900/30",
      text: "text-sky-700 dark:text-sky-300",
      icon: "text-sky-500 dark:text-sky-400",
      active: "bg-sky-100/80 dark:bg-sky-600/25 border-sky-500 text-sky-800 dark:text-sky-200 shadow-sky-500/10"
    },
    "DTH": {
      bg: "bg-purple-50 dark:bg-purple-950/20",
      border: "border-purple-200/60 dark:border-purple-900/30",
      text: "text-purple-700 dark:text-purple-300",
      icon: "text-purple-500 dark:text-purple-400",
      active: "bg-purple-100/80 dark:bg-purple-600/25 border-purple-500 text-purple-800 dark:text-purple-200 shadow-purple-500/10"
    },
    "Broadband Postpaid": {
      bg: "bg-indigo-50 dark:bg-indigo-950/20",
      border: "border-indigo-200/60 dark:border-indigo-900/30",
      text: "text-indigo-700 dark:text-indigo-300",
      icon: "text-indigo-500 dark:text-indigo-400",
      active: "bg-indigo-100/80 dark:bg-indigo-600/25 border-indigo-500 text-indigo-800 dark:text-indigo-200 shadow-indigo-500/10"
    },
    "Landline Postpaid": {
      bg: "bg-indigo-50 dark:bg-indigo-950/20",
      border: "border-indigo-200/60 dark:border-indigo-900/30",
      text: "text-indigo-700 dark:text-indigo-300",
      icon: "text-indigo-500 dark:text-indigo-400",
      active: "bg-indigo-100/80 dark:bg-indigo-600/25 border-indigo-500 text-indigo-800 dark:text-indigo-200 shadow-indigo-500/10"
    },
    "Fastag": {
      bg: "bg-teal-50 dark:bg-teal-950/20",
      border: "border-teal-200/60 dark:border-teal-900/30",
      text: "text-teal-700 dark:text-teal-300",
      icon: "text-teal-500 dark:text-teal-400",
      active: "bg-teal-100/80 dark:bg-teal-600/25 border-teal-500 text-teal-800 dark:text-teal-200 shadow-teal-500/10"
    },
    "Loan Repayment": {
      bg: "bg-violet-50 dark:bg-violet-950/20",
      border: "border-violet-200/60 dark:border-violet-900/30",
      text: "text-violet-700 dark:text-violet-300",
      icon: "text-violet-500 dark:text-violet-400",
      active: "bg-violet-100/80 dark:bg-violet-600/25 border-violet-500 text-violet-800 dark:text-violet-200 shadow-violet-500/10"
    },
    "Insurance": {
      bg: "bg-pink-50 dark:bg-pink-950/20",
      border: "border-pink-200/60 dark:border-pink-900/30",
      text: "text-pink-700 dark:text-pink-300",
      icon: "text-pink-500 dark:text-pink-400",
      active: "bg-pink-100/80 dark:bg-pink-600/25 border-pink-500 text-pink-800 dark:text-pink-200 shadow-pink-500/10"
    },
    "Cable TV": {
      bg: "bg-purple-50 dark:bg-purple-950/20",
      border: "border-purple-200/60 dark:border-purple-900/30",
      text: "text-purple-700 dark:text-purple-300",
      icon: "text-purple-500 dark:text-purple-400",
      active: "bg-purple-100/80 dark:bg-purple-600/25 border-purple-500 text-purple-800 dark:text-purple-200 shadow-purple-500/10"
    },
    "EV Recharge": {
      bg: "bg-lime-50 dark:bg-lime-950/20",
      border: "border-lime-200/60 dark:bg-lime-900/30",
      text: "text-lime-700 dark:text-lime-300",
      icon: "text-lime-500 dark:text-lime-400",
      active: "bg-lime-100/80 dark:bg-lime-600/25 border-lime-500 text-lime-800 dark:text-lime-200 shadow-lime-500/10"
    },
    "Fleet Card Recharge": {
      bg: "bg-fuchsia-50 dark:bg-fuchsia-950/20",
      border: "border-fuchsia-200/60 dark:border-fuchsia-900/30",
      text: "text-fuchsia-700 dark:text-fuchsia-300",
      icon: "text-fuchsia-500 dark:text-fuchsia-400",
      active: "bg-fuchsia-100/80 dark:bg-fuchsia-600/25 border-fuchsia-500 text-fuchsia-800 dark:text-fuchsia-200 shadow-fuchsia-500/10"
    },
    "Education Fees": {
      bg: "bg-orange-50 dark:bg-orange-950/20",
      border: "border-orange-200/60 dark:border-orange-900/30",
      text: "text-orange-700 dark:text-orange-300",
      icon: "text-orange-500 dark:text-orange-400",
      active: "bg-orange-100/80 dark:bg-orange-600/25 border-orange-500 text-orange-800 dark:text-orange-200 shadow-orange-500/10"
    },
    "Housing Society": {
      bg: "bg-cyan-50 dark:bg-cyan-950/20",
      border: "border-cyan-200/60 dark:border-cyan-900/30",
      text: "text-cyan-700 dark:text-cyan-300",
      icon: "text-cyan-500 dark:text-cyan-400",
      active: "bg-cyan-100/80 dark:bg-cyan-600/25 border-cyan-500 text-cyan-800 dark:text-cyan-200 shadow-cyan-500/10"
    },
    "Municipal Services": {
      bg: "bg-teal-50 dark:bg-teal-950/20",
      border: "border-teal-200/60 dark:border-teal-900/30",
      text: "text-teal-700 dark:text-teal-300",
      icon: "text-teal-500 dark:text-teal-400",
      active: "bg-teal-100/80 dark:bg-teal-600/25 border-teal-500 text-teal-800 dark:text-teal-200 shadow-teal-500/10"
    },
    "Municipal Taxes": {
      bg: "bg-teal-50 dark:bg-teal-950/20",
      border: "border-teal-200/60 dark:border-teal-900/30",
      text: "text-teal-700 dark:text-teal-300",
      icon: "text-teal-500 dark:text-teal-400",
      active: "bg-teal-100/80 dark:bg-teal-600/25 border-teal-500 text-teal-800 dark:text-teal-200 shadow-teal-500/10"
    },
    "NCMC Recharge": {
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      border: "border-emerald-200/60 dark:border-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-300",
      icon: "text-emerald-500 dark:text-emerald-400",
      active: "bg-emerald-100/80 dark:bg-emerald-600/25 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-emerald-500/10"
    },
    "National Pension System": {
      bg: "bg-slate-100 dark:bg-slate-900/40",
      border: "border-slate-300/60 dark:border-slate-800/80",
      text: "text-slate-700 dark:text-slate-300",
      icon: "text-slate-500 dark:text-slate-400",
      active: "bg-slate-200 dark:bg-slate-800 border-slate-500 text-slate-950 dark:text-white shadow-slate-500/10"
    },
    "Prepaid Meter": {
      bg: "bg-amber-50 dark:bg-amber-950/20",
      border: "border-amber-200/60 dark:border-amber-900/30",
      text: "text-amber-700 dark:text-amber-300",
      icon: "text-amber-500 dark:text-amber-400",
      active: "bg-amber-100/80 dark:bg-amber-600/25 border-amber-500 text-amber-800 dark:text-amber-200 shadow-amber-500/10"
    },
    "Rental": {
      bg: "bg-yellow-50 dark:bg-yellow-950/20",
      border: "border-yellow-200/60 dark:border-yellow-900/30",
      text: "text-yellow-750 dark:text-yellow-350",
      icon: "text-yellow-500 dark:text-yellow-400",
      active: "bg-yellow-100/80 dark:bg-yellow-600/25 border-yellow-500 text-yellow-800 dark:text-yellow-200 shadow-yellow-500/10"
    },
    "Subscription": {
      bg: "bg-rose-50 dark:bg-rose-950/20",
      border: "border-rose-200/60 dark:border-rose-900/30",
      text: "text-rose-700 dark:text-rose-300",
      icon: "text-rose-500 dark:text-rose-400",
      active: "bg-rose-100/80 dark:bg-rose-600/25 border-rose-500 text-rose-800 dark:text-rose-200 shadow-rose-500/10"
    },
    "Clubs and Associations": {
      bg: "bg-violet-50 dark:bg-violet-950/20",
      border: "border-violet-200/60 dark:border-violet-900/30",
      text: "text-violet-700 dark:text-violet-300",
      icon: "text-violet-500 dark:text-violet-400",
      active: "bg-violet-100/80 dark:bg-violet-600/25 border-violet-500 text-violet-800 dark:text-violet-200 shadow-violet-500/10"
    },
    "Donation": {
      bg: "bg-red-50 dark:bg-red-950/20",
      border: "border-red-200/60 dark:border-red-900/30",
      text: "text-red-700 dark:text-red-300",
      icon: "text-red-500 dark:text-red-400",
      active: "bg-red-100/80 dark:bg-red-600/25 border-red-500 text-red-800 dark:text-red-200 shadow-red-500/10"
    },
    "Forex": {
      bg: "bg-green-50 dark:bg-green-950/20",
      border: "border-green-200/60 dark:border-green-900/30",
      text: "text-green-700 dark:text-green-300",
      icon: "text-green-500 dark:text-green-400",
      active: "bg-green-100/80 dark:bg-green-600/25 border-green-500 text-green-800 dark:text-green-200 shadow-green-500/10"
    },
    "Agent Collection": {
      bg: "bg-blue-50 dark:bg-blue-950/20",
      border: "border-blue-200/60 dark:border-blue-900/30",
      text: "text-blue-700 dark:text-blue-300",
      icon: "text-blue-500 dark:text-blue-400",
      active: "bg-blue-100/80 dark:bg-blue-600/25 border-blue-500 text-blue-800 dark:text-blue-200 shadow-blue-500/10"
    },
    "eChallan": {
      bg: "bg-orange-50 dark:bg-orange-950/20",
      border: "border-orange-200/60 dark:border-orange-900/30",
      text: "text-orange-700 dark:text-orange-300",
      icon: "text-orange-500 dark:text-orange-400",
      active: "bg-orange-100/80 dark:bg-orange-600/25 border-orange-500 text-orange-800 dark:text-orange-200 shadow-orange-500/10"
    }
  };

  const getCategoryTheme = (category: string) => {
    const standardName = category.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return CATEGORY_THEMES[standardName] || {
      bg: "bg-slate-100 dark:bg-slate-900/40",
      border: "border-slate-300/60 dark:border-slate-800/80",
      text: "text-slate-700 dark:text-slate-300",
      icon: "text-slate-500 dark:text-slate-400",
      active: "bg-slate-200 dark:bg-slate-800 border-slate-500 text-slate-950 dark:text-white shadow-slate-500/10"
    };
  };

  const getCategoryClasses = (cat: string, isDark: boolean) => {
    const themeInfo = getCategoryTheme(cat);
    const baseColor = themeInfo.icon.split(' ')[0].replace('text-', '').replace('-500', '');

    if (isDark) {
      const darkThemes: Record<string, { bg: string; border: string; text: string; icon: string; shadow: string }> = {
        blue: {
          bg: "bg-gradient-to-br from-blue-500/15 to-blue-600/5 backdrop-blur-md",
          border: "border-blue-500/30 hover:border-blue-500/60",
          text: "text-blue-200",
          icon: "text-blue-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(59,130,246,0.45)]"
        },
        amber: {
          bg: "bg-gradient-to-br from-amber-500/15 to-amber-600/5 backdrop-blur-md",
          border: "border-amber-500/30 hover:border-amber-500/60",
          text: "text-amber-200",
          icon: "text-amber-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(245,158,11,0.45)]"
        },
        emerald: {
          bg: "bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 backdrop-blur-md",
          border: "border-emerald-500/30 hover:border-emerald-500/60",
          text: "text-emerald-200",
          icon: "text-emerald-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.45)]"
        },
        rose: {
          bg: "bg-gradient-to-br from-rose-500/15 to-rose-600/5 backdrop-blur-md",
          border: "border-rose-500/30 hover:border-rose-500/60",
          text: "text-rose-200",
          icon: "text-rose-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(244,63,94,0.45)]"
        },
        sky: {
          bg: "bg-gradient-to-br from-sky-500/15 to-sky-600/5 backdrop-blur-md",
          border: "border-sky-500/30 hover:border-sky-500/60",
          text: "text-sky-200",
          icon: "text-sky-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(14,165,233,0.45)]"
        },
        purple: {
          bg: "bg-gradient-to-br from-purple-500/15 to-purple-600/5 backdrop-blur-md",
          border: "border-purple-500/30 hover:border-purple-500/60",
          text: "text-purple-200",
          icon: "text-purple-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(139,92,246,0.45)]"
        },
        indigo: {
          bg: "bg-gradient-to-br from-indigo-500/15 to-indigo-600/5 backdrop-blur-md",
          border: "border-indigo-500/30 hover:border-indigo-500/60",
          text: "text-indigo-200",
          icon: "text-indigo-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(99,102,241,0.45)]"
        },
        teal: {
          bg: "bg-gradient-to-br from-teal-500/15 to-teal-600/5 backdrop-blur-md",
          border: "border-teal-500/30 hover:border-teal-500/60",
          text: "text-teal-200",
          icon: "text-teal-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(20,184,166,0.45)]"
        },
        violet: {
          bg: "bg-gradient-to-br from-violet-500/15 to-violet-600/5 backdrop-blur-md",
          border: "border-violet-500/30 hover:border-violet-500/60",
          text: "text-violet-200",
          icon: "text-violet-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(109,40,217,0.45)]"
        },
        pink: {
          bg: "bg-gradient-to-br from-pink-500/15 to-pink-600/5 backdrop-blur-md",
          border: "border-pink-500/30 hover:border-pink-500/60",
          text: "text-pink-200",
          icon: "text-pink-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(236,72,153,0.45)]"
        },
        lime: {
          bg: "bg-gradient-to-br from-lime-500/15 to-lime-600/5 backdrop-blur-md",
          border: "border-lime-500/30 hover:border-lime-500/60",
          text: "text-lime-200",
          icon: "text-lime-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(132,204,22,0.45)]"
        },
        fuchsia: {
          bg: "bg-gradient-to-br from-fuchsia-500/15 to-fuchsia-600/5 backdrop-blur-md",
          border: "border-fuchsia-500/30 hover:border-fuchsia-500/60",
          text: "text-fuchsia-200",
          icon: "text-fuchsia-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(217,70,239,0.45)]"
        },
        orange: {
          bg: "bg-gradient-to-br from-orange-500/15 to-orange-600/5 backdrop-blur-md",
          border: "border-orange-500/30 hover:border-orange-500/60",
          text: "text-orange-200",
          icon: "text-orange-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(249,115,22,0.45)]"
        },
        cyan: {
          bg: "bg-gradient-to-br from-cyan-500/15 to-cyan-600/5 backdrop-blur-md",
          border: "border-cyan-500/30 hover:border-cyan-500/60",
          text: "text-cyan-200",
          icon: "text-cyan-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(6,182,212,0.45)]"
        },
        slate: {
          bg: "bg-gradient-to-br from-slate-500/15 to-slate-600/5 backdrop-blur-md",
          border: "border-slate-500/30 hover:border-slate-500/60",
          text: "text-slate-200",
          icon: "text-slate-300",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(100,116,139,0.45)]"
        }
      };

      return darkThemes[baseColor] || darkThemes.slate;
    } else {
      const lightThemes: Record<string, { bg: string; border: string; text: string; icon: string; shadow: string }> = {
        blue: {
          bg: "bg-gradient-to-br from-blue-50/80 to-blue-100/40 backdrop-blur-md",
          border: "border-blue-200/80 hover:border-blue-400/60",
          text: "text-blue-700",
          icon: "text-blue-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(59,130,246,0.18)]"
        },
        amber: {
          bg: "bg-gradient-to-br from-amber-50/80 to-amber-100/40 backdrop-blur-md",
          border: "border-amber-200/80 hover:border-amber-400/60",
          text: "text-amber-700",
          icon: "text-amber-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(245,158,11,0.18)]"
        },
        emerald: {
          bg: "bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 backdrop-blur-md",
          border: "border-emerald-200/80 hover:border-emerald-400/60",
          text: "text-emerald-700",
          icon: "text-emerald-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.18)]"
        },
        rose: {
          bg: "bg-gradient-to-br from-rose-50/80 to-rose-100/40 backdrop-blur-md",
          border: "border-rose-200/80 hover:border-rose-400/60",
          text: "text-rose-700",
          icon: "text-rose-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(244,63,94,0.18)]"
        },
        sky: {
          bg: "bg-gradient-to-br from-sky-50/80 to-sky-100/40 backdrop-blur-md",
          border: "border-sky-200/80 hover:border-sky-400/60",
          text: "text-sky-700",
          icon: "text-sky-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(14,165,233,0.18)]"
        },
        purple: {
          bg: "bg-gradient-to-br from-purple-50/80 to-purple-100/40 backdrop-blur-md",
          border: "border-purple-200/80 hover:border-purple-400/60",
          text: "text-purple-700",
          icon: "text-purple-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(139,92,246,0.18)]"
        },
        indigo: {
          bg: "bg-gradient-to-br from-indigo-50/80 to-indigo-100/40 backdrop-blur-md",
          border: "border-indigo-200/80 hover:border-indigo-400/60",
          text: "text-indigo-700",
          icon: "text-indigo-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(99,102,241,0.18)]"
        },
        teal: {
          bg: "bg-gradient-to-br from-teal-50/80 to-teal-100/40 backdrop-blur-md",
          border: "border-teal-200/80 hover:border-teal-400/60",
          text: "text-teal-700",
          icon: "text-teal-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(20,184,166,0.18)]"
        },
        violet: {
          bg: "bg-gradient-to-br from-violet-50/80 to-violet-100/40 backdrop-blur-md",
          border: "border-violet-200/80 hover:border-violet-400/60",
          text: "text-violet-700",
          icon: "text-violet-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(109,40,217,0.18)]"
        },
        pink: {
          bg: "bg-gradient-to-br from-pink-50/80 to-pink-100/40 backdrop-blur-md",
          border: "border-pink-200/80 hover:border-pink-400/60",
          text: "text-pink-700",
          icon: "text-pink-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(236,72,153,0.18)]"
        },
        lime: {
          bg: "bg-gradient-to-br from-lime-50/80 to-lime-100/40 backdrop-blur-md",
          border: "border-lime-200/80 hover:border-lime-400/60",
          text: "text-lime-700",
          icon: "text-lime-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(132,204,22,0.18)]"
        },
        fuchsia: {
          bg: "bg-gradient-to-br from-fuchsia-50/80 to-fuchsia-100/40 backdrop-blur-md",
          border: "border-fuchsia-200/80 hover:border-fuchsia-400/60",
          text: "text-fuchsia-700",
          icon: "text-fuchsia-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(217,70,239,0.18)]"
        },
        orange: {
          bg: "bg-gradient-to-br from-orange-50/80 to-orange-100/40 backdrop-blur-md",
          border: "border-orange-200/80 hover:border-orange-400/60",
          text: "text-orange-700",
          icon: "text-orange-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(249,115,22,0.18)]"
        },
        cyan: {
          bg: "bg-gradient-to-br from-cyan-50/80 to-cyan-100/40 backdrop-blur-md",
          border: "border-cyan-200/80 hover:border-cyan-400/60",
          text: "text-cyan-700",
          icon: "text-cyan-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(6,182,212,0.18)]"
        },
        slate: {
          bg: "bg-gradient-to-br from-slate-50/80 to-slate-100/40 backdrop-blur-md",
          border: "border-slate-200/80 hover:border-slate-400/60",
          text: "text-slate-700",
          icon: "text-slate-600",
          shadow: "hover:shadow-[0_8px_20px_-6px_rgba(100,116,139,0.18)]"
        }
      };
      return lightThemes[baseColor] || lightThemes.slate;
    }
  };

  // Load active categories from Supabase settings
  useEffect(() => {
    const loadActiveCategories = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'category_settings')
            .single();

          if (!error && data && data.value) {
            const settings = data.value as Record<string, boolean>;
            // Filter PRESET_CATEGORIES where visibility is not explicitly set to false
            const activeCats = PRESET_CATEGORIES.filter(cat => settings[cat] !== false);
            setCategories(activeCats);
            return;
          }
        } catch (dbErr) {
          console.warn('Failed to load category settings, using defaults:', dbErr);
        }
      }
      setCategories(PRESET_CATEGORIES);
    };

    loadActiveCategories();
  }, [isSupabaseConfigured, supabase]);

  // Load billers matching selectedCategory
  useEffect(() => {
    const loadBillersForCategory = async () => {
      if (!selectedCategory) return;

      // 1. Try loading from Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('billers')
            .select('*')
            .ilike('category', selectedCategory);

          if (!error && data && data.length > 0) {
            const filteredData = selectedCategory === 'Credit Card'
              ? data.filter(b => b.biller_name.toLowerCase().includes('card'))
              : data;

            if (filteredData.length > 0) {
              setBillers(filteredData);
              setSelectedBiller(filteredData[0]);

              // Initialize input parameters
              const initVals: Record<string, string> = {};
              getParamInfoList(filteredData[0]).forEach((p: any) => {
                if (p.paramName === 'Mobile Number') {
                  initVals[p.paramName] = currentUser?.phone || '';
                } else {
                  initVals[p.paramName] = '';
                }
              });
              setParamValues(initVals);
              setFetchedBill(null);
              return;
            }
          }
        } catch (dbErr) {
          console.warn('Failed to load billers for category from database:', dbErr);
        }
      }

      // 2. Fallback to preset Credit Cards if category is Credit Card and DB is empty
      if (selectedCategory === 'Credit Card') {
        setBillers(PRESET_CC_BILLERS);
        setSelectedBiller(PRESET_CC_BILLERS[0]);

        const initVals: Record<string, string> = {
          'Last 4 Digits of Card Number': '8821',
          'Mobile Number': currentUser?.phone || '9876543210'
        };
        setParamValues(initVals);
        setFetchedBill(null);
      }
    };

    loadBillersForCategory();
  }, [selectedCategory, currentUser, isSupabaseConfigured, supabase]);

  // Load banners from Supabase system_settings
  useEffect(() => {
    const loadBanners = async () => {
      let loadedBanners = [
        {
          id: '1',
          title: 'HDFC Bank Infinia Card',
          description: 'Get up to 10% CashBack on all utility payments.',
          imageUrl: '/hdfc_promo.jpg',
          targetUrl: '/credit-card-bill'
        },
        {
          id: '2',
          title: 'SBI Card Discount',
          description: 'Flat ₹500 discount on electricity and water bills.',
          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=60',
          targetUrl: '/credit-card-bill'
        },
        {
          id: '3',
          title: 'ICICI Rubyx Credit Card',
          description: 'Earn 5X reward points on DTH and Cable TV bills.',
          imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=600&auto=format&fit=crop&q=60',
          targetUrl: '/credit-card-bill'
        }
      ];

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'advertising_banners')
            .single();

          if (!error && data && data.value && Array.isArray(data.value) && data.value.length > 0) {
            loadedBanners = data.value;
          }
        } catch (err) {
          console.error("Failed to load banners:", err);
        }
      }
      setBanners(loadedBanners);
      if (loadedBanners.length > 0) {
        setCurrentBannerIndex(Math.floor(Math.random() * loadedBanners.length));
      }
    };

    loadBanners();
  }, [isSupabaseConfigured, supabase]);

  // Rotate banner randomly every 15 seconds
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      let nextIndex = currentBannerIndex;
      while (nextIndex === currentBannerIndex && banners.length > 1) {
        nextIndex = Math.floor(Math.random() * banners.length);
      }
      setCurrentBannerIndex(nextIndex);
    }, 15000); // 15 seconds rotation for testing

    return () => clearInterval(interval);
  }, [banners, currentBannerIndex]);

  // Auto-focus the first T-PIN input when the modal is shown
  useEffect(() => {
    if (showTpinModal) {
      setTimeout(() => {
        const firstInput = document.getElementById('tpin-digit-0');
        if (firstInput) {
          firstInput.focus();
        }
      }, 50);
    }
  }, [showTpinModal]);

  const handlePresetSelect = (card: typeof savedCardsPreset[0]) => {
    const matched = billers.find(b =>
      b.biller_name.toLowerCase().includes(card.bank.toLowerCase().split(' ')[0])
    ) || billers[0];

    setSelectedBiller(matched);

    const cleanNum = card.number.replace(/\D/g, '');
    const last4 = cleanNum.slice(-4) || '8821';

    setParamValues({
      'Last 4 Digits of Card Number': last4,
      'Mobile Number': currentUser?.phone || '9876543210'
    });
    setFetchedBill(null);
  };


  const handleFetchBill = async () => {
    if (!currentUser?.x_api_key || !currentUser?.x_secret_key) {
      setErrorMessage('API Credentials (x-api-key, x-secret-key) missing! Please configure them in your User Profile first.');
      return;
    }

    setErrorMessage('');
    setIsFetchingBill(true);
    setFetchedBill(null);

    const customerParams = getParamInfoList(selectedBiller).map((param: any) => ({
      name: param.paramName,
      value: paramValues[param.paramName] || ''
    }));

    try {
      const response = await fetch('https://www.usepay.in/api/v1/b2b/fetch-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': currentUser.x_api_key,
          'x-secret-key': currentUser.x_secret_key
        },
        body: JSON.stringify({
          billerId: selectedBiller.biller_id,
          mobile: paramValues['Mobile Number'] || currentUser.phone || '9876543210',
          customerParams: customerParams
        })
      });

      const resData = await response.json();

      if (!response.ok || resData.status === 'error' || resData.status === 'failed') {
        throw new Error(resData.message || resData.data?.message || 'Failed to fetch bill. Make sure your input details are correct.');
      }

      const billInfo = resData.data?.billerResponse;
      if (billInfo) {
        setFetchedBill({
          ...billInfo,
          requestId: resData.data?.requestId,
          rawFetchData: resData.data
        });
        setAmount(billInfo.amount || '0');
        if (billInfo.customerName) {
          setCardholderName(billInfo.customerName);
        }
      } else {
        throw new Error('No bill details returned for this account.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch bill.');
    } finally {
      setIsFetchingBill(false);
    }
  };

  const handleCloseReceipt = () => {
    setReceiptBill(null);
    setFetchedBill(null);
    setActiveStep(1);
    setSelectedCategory('');
  };

  const handleTpinVerifyAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setTpinModalError('');

    if (!currentUser) return;

    const activeTpin = currentUser.tpin || JSON.parse(localStorage.getItem('zentopay_user_tpins') || '{}')[currentUser.id];
    if (enteredTpin !== activeTpin) {
      setTpinModalError('Incorrect T-PIN. Please try again.');
      return;
    }

    // Close T-PIN Modal and start payment
    setShowTpinModal(false);
    setIsProcessing(true);

    const numAmount = parseFloat(amount);
    const customerParams = getParamInfoList(selectedBiller).map((param: any) => ({
      name: param.paramName,
      value: paramValues[param.paramName] || ''
    }));

    const cardKey = Object.keys(paramValues).find((key) => {
      const k = key.toLowerCase();
      return k.includes('last 4') || k.includes('card number') || (k.includes('card') && !k.includes('cardholder'));
    });
    const last4Val = cardKey ? paramValues[cardKey] : '';
    const last4 = last4Val ? last4Val.replace(/\s/g, '').slice(-4) : 'XXXX';

    // Strict client-side rate limit lock (Prevent double submit within 15 seconds)
    const lockKey = `zentopay_tx_lock_${currentUser.id}`;
    const lastTxTime = localStorage.getItem(lockKey);
    if (lastTxTime) {
      const diff = Date.now() - parseInt(lastTxTime);
      if (diff < 15000) {
        setIsProcessing(false);
        setErrorMessage('A transaction is already being processed. Please wait 15 seconds before retrying to prevent double charges.');
        return;
      }
    }
    localStorage.setItem(lockKey, Date.now().toString());

    setTimeout(async () => {
      try {
        const resultBill = await payBill({
          user_id: currentUser.id,
          card_number: `•••• •••• •••• ${last4}`,
          cardholder_name: cardholderName,
          bank_name: selectedBiller.biller_name,
          amount: numAmount,
          payment_method: paymentMethod,
        }, {
          billerId: selectedBiller.biller_id,
          customerParams: customerParams,
          billerResponseInfo: fetchedBill?.rawFetchData,
          mobile: Object.keys(paramValues).find(k => k.toLowerCase().includes('mobile') || k.toLowerCase().includes('phone')) 
            ? paramValues[Object.keys(paramValues).find(k => k.toLowerCase().includes('mobile') || k.toLowerCase().includes('phone'))!] 
            : (currentUser.phone || '9876543210')
        });

        setIsProcessing(false);
        setReceiptBill(resultBill);
      } catch (err: any) {
        setIsProcessing(false);
        setErrorMessage(err.message || 'Payment failed. Please try again.');
      }
    }, 1200);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid bill payment amount.');
      return;
    }

    if (!currentUser) return;

    // Check if T-PIN is configured
    const activeTpin = currentUser.tpin || JSON.parse(localStorage.getItem('zentopay_user_tpins') || '{}')[currentUser.id];
    if (!activeTpin) {
      setErrorMessage('Please configure your 4-digit Transaction PIN (T-PIN) in the Change Password page first.');
      return;
    }

    // Open T-PIN Verification Modal
    setEnteredTpin('');
    setTpinModalError('');
    setShowTpinModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Utility & Credit Card Bill Pay</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Zero Charge Instant Settlement
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pay any utility, Gas, Electricity, DTH or credit card bill instantly with UPI, NetBanking, or Debit Card.
          </p>
        </div>
        <div className="flex items-center shrink-0 bg-white/10 px-4 py-2 rounded-xl border border-white/10">
          <img src={bharatConnectLogo} alt="Bharat Connect Logo" className="h-8 sm:h-10 w-auto object-contain" />
        </div>
      </div>

      {/* Main Grid: Form Left, Saved Cards & Presets Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Form */}
        <div className="lg:col-span-2 glass-panel p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Bill Payment Details</h2>
                <p className="text-xs text-slate-400">Instant credit clearance within 120 seconds</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center space-x-1">
              <Zap className="h-3 w-3" />
              <span>BBPS Direct Gateway</span>
            </span>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handlePaySubmit} className="space-y-4">
            {activeStep === 1 ? (
              /* Step 1: Category Selection Grid */
              <div className="space-y-3 mb-6">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Select Bill Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {categories.map((cat) => {
                    const IconComponent = getCategoryIcon(cat);
                    const isDark = theme === 'dark';
                    const c = getCategoryClasses(cat, isDark);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setActiveStep(2);
                        }}
                        className={`p-3.5 rounded-xl border text-xs font-bold transition-all duration-300 flex flex-col items-center justify-center space-y-2.5 group shadow-sm hover:shadow-md ${c.bg} ${c.border} ${c.text} hover:scale-[1.02]`}
                      >
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-950/40 border-slate-800/30' : 'bg-white/80 border-slate-200/30'} border shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                          <IconComponent className={`h-5 w-5 ${c.icon}`} />
                        </div>
                        <span className="text-center truncate w-full tracking-wide">{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Step 2: Form & Selected Category */
              <div className="space-y-4 animate-fadeIn">
                {/* Selected Category Header Breadcrumb */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                      {React.createElement(getCategoryIcon(selectedCategory), { className: "h-5 w-5" })}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">Selected Category</span>
                      <span className="text-xs font-bold text-white">{selectedCategory}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStep(1);
                      setSelectedCategory('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[10px] font-bold border border-slate-700 transition-all"
                  >
                    Change Category
                  </button>
                </div>

                {/* Biller selection Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Select Utility / Card Biller
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setBillerDropdownOpen(!billerDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl glass-input text-xs font-medium text-slate-200 text-left bg-slate-950/40 hover:bg-slate-950/60 border border-slate-800 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5">
                        {selectedBiller && (
                          <div className="h-9 w-9 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-slate-700/50 shadow-sm">
                            {getBillerLogoUrl(selectedBiller.biller_name) ? (
                              <img 
                                src={getBillerLogoUrl(selectedBiller.biller_name)!} 
                                alt={selectedBiller.biller_name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <CreditCard className="h-4 w-4 text-indigo-600" />
                            )}
                          </div>
                        )}
                        <span>{selectedBiller ? selectedBiller.biller_name : 'Select a biller...'}</span>
                      </div>
                      <svg className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${billerDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {billerDropdownOpen && (
                      <div className="absolute top-full mt-1.5 left-0 w-full z-[100] rounded-xl bg-slate-900/98 backdrop-blur-2xl border border-slate-800/80 shadow-2xl p-2.5 space-y-2">
                        {/* Search Input */}
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search biller..."
                            value={billerSearchQuery}
                            onChange={(e) => setBillerSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                            autoFocus
                          />
                        </div>

                        {/* Options List */}
                        <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
                          {filteredBillersList.map((b) => {
                            const isSelected = selectedBiller?.biller_id === b.biller_id;
                            return (
                              <button
                                key={b.biller_id}
                                type="button"
                                onClick={() => {
                                  setSelectedBiller(b);
                                  // Initialize empty values for inputs
                                  const initVals: Record<string, string> = {};
                                  getParamInfoList(b).forEach((p: any) => {
                                    if (p.paramName === 'Mobile Number') {
                                      initVals[p.paramName] = currentUser?.phone || '';
                                    } else {
                                      initVals[p.paramName] = '';
                                    }
                                  });
                                  setParamValues(initVals);
                                  setFetchedBill(null);
                                  setBillerDropdownOpen(false);
                                  setBillerSearchQuery('');
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/35 shadow-sm shadow-indigo-950/30'
                                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className="h-9 w-9 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-slate-750/30 shadow-sm">
                                    {getBillerLogoUrl(b.biller_name) ? (
                                      <img 
                                        src={getBillerLogoUrl(b.biller_name)!} 
                                        alt={b.biller_name}
                                        className="h-full w-full object-contain"
                                      />
                                    ) : (
                                      <CreditCard className="h-4 w-4 text-indigo-600" />
                                    )}
                                  </div>
                                  <span>{b.biller_name}</span>
                                </div>
                                {isSelected && (
                                  <svg className="h-4 w-4 text-indigo-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                          {filteredBillersList.length === 0 && (
                            <div className="py-6 text-center text-slate-500 text-xs">
                              No billers found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dynamic Metadata Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {getParamInfoList(selectedBiller).map((param: any) => (
                    <div key={param.paramName}>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 min-h-[32px] flex items-end">
                        <span>{getShortLabel(param.paramName)} {param.isOptional === 'true' ? '(Optional)' : ''}</span>
                      </label>
                      <input
                        type="text"
                        inputMode={param.dataType === 'NUMERIC' ? 'numeric' : 'text'}
                        pattern={param.dataType === 'NUMERIC' ? '[0-9]*' : undefined}
                        value={paramValues[param.paramName] || ''}
                        onChange={(e) => {
                          const val = param.dataType === 'NUMERIC' ? e.target.value.replace(/\D/g, '') : e.target.value;
                          setParamValues(prev => ({ ...prev, [param.paramName]: val }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleFetchBill();
                          }
                        }}
                        placeholder={`Enter ${getShortLabel(param.paramName)}`}
                        required={param.isOptional !== 'true'}
                        className="w-full px-4 py-3 rounded-xl glass-input text-xs"
                      />
                    </div>
                  ))}
                </div>

                {/* Fetch Bill Action Button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleFetchBill}
                    disabled={isFetchingBill}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 text-xs font-bold transition-all flex items-center space-x-2"
                  >
                    {isFetchingBill ? (
                      <>
                        <div className="h-3 w-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        <span>Fetching Bill...</span>
                      </>
                    ) : (
                      <>
                        <Receipt className="h-4 w-4" />
                        <span>Fetch Outstanding Bill</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Fetched Bill Container */}
                {fetchedBill && (
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-3 mt-4 text-left animate-fadeIn">
                    <p className="font-bold text-indigo-300 border-b border-indigo-500/10 pb-1 flex items-center justify-between">
                      <span>Fetched Bill Details</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">Active Bill</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Biller Name</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="h-9 w-9 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-slate-700/50 shadow-sm">
                            {selectedBiller && getBillerLogoUrl(selectedBiller.biller_name) ? (
                              <img 
                                src={getBillerLogoUrl(selectedBiller.biller_name)!} 
                                alt={selectedBiller.biller_name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <CreditCard className="h-4 w-4 text-indigo-600" />
                            )}
                          </div>
                          <span className="font-semibold text-slate-100">{selectedBiller?.biller_name}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Customer Name</span>
                        <span className="font-semibold text-slate-100">{fetchedBill.customerName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Outstanding Amount</span>
                        <span className="font-extrabold text-emerald-400 font-mono">₹{parseFloat(fetchedBill.amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Minimum Due Amount</span>
                        <span className="font-bold text-amber-400 font-mono">
                          ₹{parseFloat(fetchedBill.minBillAmount || fetchedBill.minimumDueAmount || fetchedBill.minAmount || fetchedBill.minDue || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Bill Date</span>
                        <span className="font-semibold text-slate-100 font-mono">{fetchedBill.billDate || fetchedBill.date || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Payment Due Date</span>
                        <span className="font-semibold text-indigo-300 font-mono">{fetchedBill.dueDate || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Manual Amount Entry Field */}
                    <div className="border-t border-indigo-500/10 pt-3 mt-2">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                        Enter Amount to Pay (₹)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        placeholder="Enter Custom Amount to Pay"
                        required
                        className="w-full px-4 py-3 rounded-xl glass-input text-xs font-mono font-bold text-white bg-slate-900/50 border border-slate-700/60 focus:border-indigo-500/50 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        You can pay the full outstanding amount or enter a custom amount (e.g. minimum due).
                      </p>
                    </div>
                  </div>
                )}

                {/* Pay Button */}
                {fetchedBill && (
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-indigo-600/30 disabled:shadow-none flex items-center justify-center space-x-2 mt-4"
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing Bill Payment...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-5 w-5 text-emerald-400" />
                        <span>Proceed to Pay ₹{parseFloat(amount || '0').toLocaleString('en-IN')}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Right Panel: Saved Cards Quick Selection */}
        <div className="space-y-4">
          {/* Advertising Rotator Banner */}
          {banners.length > 0 && (
            <div className="glass-panel overflow-hidden border border-slate-800 relative group animate-fadeIn">
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
                <img 
                  src={banners[currentBannerIndex].imageUrl} 
                  alt={banners[currentBannerIndex].title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=600&auto=format&fit=crop&q=60';
                  }}
                />
                {/* Banner Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-4">
                  <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                    Sponsored Ad
                  </span>
                  <h4 className="text-xs font-bold text-white tracking-wide">
                    {banners[currentBannerIndex].title}
                  </h4>
                  <p className="text-[10px] text-slate-300 mt-1 line-clamp-2">
                    {banners[currentBannerIndex].description}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="glass-panel p-6 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-3">Saved Cards Quick Selection</h3>
            <p className="text-xs text-slate-400 mb-4">Click any saved card to autofill payment details.</p>

            <div className="space-y-3">
              {savedCardsPreset.map((card, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetSelect(card)}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/30 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                      {card.bank}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">{card.number}</p>
                  </div>
                  <Sparkles className="h-4 w-4 text-slate-600 group-hover:text-indigo-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Guaranteed Security Badge */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold">100% Encrypted & Instant</p>
              <p className="text-emerald-300/80 text-[11px] mt-0.5">
                Payments are processed using PCI-DSS compliant direct banking APIs with instant receipt generation.
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* T-PIN Verification Modal */}
      {showTpinModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full glass-panel p-6 border border-emerald-500/30 shadow-2xl relative">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/30">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Enter Transaction T-PIN</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your 4-digit T-PIN to authorize the bill payment of <span className="font-mono font-bold text-white">₹{parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>

            {tpinModalError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{tpinModalError}</span>
              </div>
            )}

            <form onSubmit={handleTpinVerifyAndPay} className="space-y-4">
              <div className="flex justify-center gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <input
                    key={i}
                    id={`tpin-digit-${i}`}
                    type="password"
                    maxLength={1}
                    value={enteredTpin[i] || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val) {
                        const newTpin = enteredTpin.split('');
                        newTpin[i] = val;
                        const nextVal = newTpin.join('');
                        setEnteredTpin(nextVal);
                        if (i < 3) {
                          document.getElementById(`tpin-digit-${i + 1}`)?.focus();
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        const newTpin = enteredTpin.split('');
                        newTpin[i] = '';
                        setEnteredTpin(newTpin.join(''));
                        if (i > 0) {
                          document.getElementById(`tpin-digit-${i - 1}`)?.focus();
                        }
                      }
                    }}
                    className="w-12 h-12 text-center text-xl font-bold bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTpinModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enteredTpin.length !== 4}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Confirm & Pay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {receiptBill && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-md w-full glass-panel p-6 border shadow-2xl relative ${
            receiptBill.status === 'Success' ? 'border-emerald-500/30' :
            receiptBill.status === 'Pending' ? 'border-amber-500/30' : 'border-rose-500/30'
          }`}>
            {/* Close button top right */}
            <button 
              onClick={handleCloseReceipt}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center mb-6">
              {receiptBill.status === 'Success' && (
                <>
                  <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/30">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Bill Payment Successful</h3>
                </>
              )}
              {receiptBill.status === 'Pending' && (
                <>
                  <div className="inline-flex p-3 rounded-full bg-amber-500/20 text-amber-400 mb-3 border border-amber-500/30 animate-pulse">
                    <Clock className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Bill Payment Pending</h3>
                </>
              )}
              {receiptBill.status === 'Failed' && (
                <>
                  <div className="inline-flex p-3 rounded-full bg-rose-500/20 text-rose-400 mb-3 border border-rose-500/30">
                    <XCircle className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Bill Payment Failed</h3>
                </>
              )}
              <p className="text-xs text-slate-400 mt-1">Transaction Ref: <span className="font-mono text-indigo-300 font-bold">{receiptBill.transaction_ref}</span></p>
            </div>

            <div className="space-y-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Card Issuer / Biller</span>
                <span className="font-bold text-slate-200">{receiptBill.bank_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Card / Account Number</span>
                <span className="font-mono text-slate-200">{receiptBill.card_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Cardholder / Customer Name</span>
                <span className="font-semibold text-slate-200">{receiptBill.cardholder_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Payment Status</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                  receiptBill.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  receiptBill.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>{receiptBill.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Payment Amount</span>
                <span className={`font-extrabold font-mono text-sm ${
                  receiptBill.status === 'Success' ? 'text-emerald-400' :
                  receiptBill.status === 'Pending' ? 'text-amber-400' : 'text-rose-400'
                }`}>₹{receiptBill.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Payment Gateway</span>
                <span className="text-slate-300">{parsePaymentMethod(receiptBill.payment_method).method}</span>
              </div>
            </div>

            <button
              onClick={handleCloseReceipt}
              className="mt-6 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/30"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
