import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { Wallet, CreditCard, DollarSign, Zap, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { parsePaymentMethod } from './CreditCardBillPay';

interface UserDashboardProps {
  onNavigateToPay: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigateToPay }) => {
  const { currentUser, bills, fundRequests } = useAuth();
  const [apiBalance, setApiBalance] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Card Flip States
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const toggleFlip = (cardId: string) => {
    setFlippedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };
  
  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!currentUser?.x_api_key || !currentUser?.x_secret_key) {
      setApiBalance(null);
      setApiError(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const response = await fetch('https://www.usepay.in/api/v1/b2b/balance', {
          headers: {
            'x-api-key': currentUser.x_api_key || '',
            'x-secret-key': currentUser.x_secret_key || ''
          }
        });
        const res = await response.json();
        if (res.status === 'success' && res.data && typeof res.data.balance !== 'undefined') {
          setApiBalance(Number(res.data.balance));
          setApiError(null);
        } else {
          setApiError(res.message || 'API Error');
        }
      } catch (err: any) {
        console.warn('Failed to fetch API balance in dashboard:', err);
        setApiError('CORS/Connection Error');
      }
    };

    fetchBalance();
  }, [currentUser?.x_api_key, currentUser?.x_secret_key]);

  const userBills = bills.filter((b) => b.user_id === currentUser?.id);

  // 1. Get all successful bills for this user
  const successfulBills = userBills.filter((b) => b.status === 'Success');

  // 2. Find the unique cards from these successful bills (ordered by most recent success)
  const uniqueCardsList: any[] = [];
  const seenLast4 = new Set<string>();

  // Sort bills newest to oldest so we evaluate most recent successful ones first
  const sortedBillsDesc = [...successfulBills].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  sortedBillsDesc.forEach((bill) => {
    const cleanCard = (bill.card_number || '').replace(/\s/g, '');
    const last4 = cleanCard.slice(-4);
    if (!last4 || last4.toLowerCase().includes('x')) return;

    if (!seenLast4.has(last4)) {
      seenLast4.add(last4);

      let cardType = 'CREDIT CARD';
      const cardNumPlain = bill.card_number.replace(/\D/g, '');
      if (cardNumPlain.startsWith('4')) cardType = 'VISA';
      else if (cardNumPlain.startsWith('5')) cardType = 'MASTERCARD';
      else if (cardNumPlain.startsWith('6')) cardType = 'RUPAY';
      
      uniqueCardsList.push({
        id: last4,
        name: bill.bank_name,
        type: cardType,
        number: bill.card_number,
        last4: last4,
        exp: '12/29', // fallback exp
        cardholder_name: bill.cardholder_name,
        isReal: true
      });
    }
  });

  // 3. Keep only the last 4 unique successful cards (ordered latest first) and assign distinct gradients
  const finalCards = uniqueCardsList.slice(0, 4).map((card, index) => {
    const gradients = [
      {
        gradientClass: 'card-gradient-hdfc',
        borderClass: 'border-indigo-500/30',
        textClass: 'text-indigo-300',
        brandColor: 'text-amber-400',
      },
      {
        gradientClass: 'card-gradient-icici',
        borderClass: 'border-red-500/30',
        textClass: 'text-red-200',
        brandColor: 'text-slate-200',
      },
      {
        gradientClass: 'card-gradient-sbi',
        borderClass: 'border-emerald-500/30',
        textClass: 'text-emerald-200',
        brandColor: 'text-emerald-300',
      },
      {
        gradientClass: 'card-gradient-gold',
        borderClass: 'border-amber-500/30',
        textClass: 'text-amber-200',
        brandColor: 'text-amber-400',
      }
    ];

    const style = gradients[index % gradients.length];
    return {
      ...card,
      ...style
    };
  });

  // Auto Scroll slider logic
  useEffect(() => {
    if (finalCards.length <= 1) return;

    // Pause auto-sliding if the user is currently viewing the back of any card
    const isAnyCardFlipped = Object.values(flippedCards).some(val => val === true);
    if (isAnyCardFlipped) return;

    const interval = setInterval(() => {
      if (sliderRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          sliderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          sliderRef.current.scrollBy({ left: 320, behavior: 'smooth' });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [finalCards.length, flippedCards]);


  const totalPaidAmount = userBills
    .filter((b) => b.status === 'Success')
    .reduce((acc, b) => acc + b.amount, 0);

  const userFundRequests = fundRequests.filter((r) => r.user_id === currentUser?.id);
  const successFundsTotal = userFundRequests
    .filter((r) => r.status === 'approved')
    .reduce((acc, r) => acc + r.amount, 0);
  const successFundsCount = userFundRequests.filter((r) => r.status === 'approved').length;
  const successBillsCount = userBills.filter((b) => b.status === 'Success').length;



  return (
    <div className="space-y-6">
      <style>{`
        .card-container {
          perspective: 1000px;
        }
        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }
        .card-inner.flipped {
          transform: rotateY(180deg);
        }
        .card-front, .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          left: 0;
          top: 0;
        }
        .card-back {
          transform: rotateY(180deg);
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, <span className="text-indigo-400">{currentUser?.full_name}</span>
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            User Panel
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Manage your credit cards, pay bills instantly with zero charges, and track reward points.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Available Wallet Limit"
          value={
            !currentUser?.x_api_key || !currentUser?.x_secret_key
              ? `₹${(currentUser?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              : apiError
                ? "Conn Error"
                : apiBalance !== null 
                  ? `₹${apiBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                  : 'Loading...'
          }
          subtitle={
            !currentUser?.x_api_key || !currentUser?.x_secret_key
              ? "Instant Settlement Reserve"
              : apiError
                ? `UsePay API Error: ${apiError}`
                : "Live B2B Wallet Balance"
          }
          icon={Wallet}
          color={apiError ? "rose" : "emerald"}
        />

        <StatCard
          title="Saved Credit Cards"
          value={`${finalCards.length} Cards`}
          subtitle={finalCards.length > 0 ? finalCards.map((c) => c.name.split(' ')[0]).join(', ') : "No active cards"}
          icon={CreditCard}
          color="purple"
        />

        <StatCard
          title="Total Funds Added"
          value={`₹${successFundsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`${successFundsCount} Approved Fund Requests`}
          icon={DollarSign}
          color="indigo"
        />

        <StatCard
          title="Total Bills Paid"
          value={`₹${totalPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`${successBillsCount} Successful Payments`}
          icon={Zap}
          color="amber"
        />
      </div>

      {/* Credit Cards Display Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Active Credit Cards (Last 4 Successful)</h2>
          {finalCards.length > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={scrollLeft}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Scroll Left"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={scrollRight}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Scroll Right"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {finalCards.length === 0 ? (
          <div className="p-6 rounded-2xl glass-card border border-slate-800/80 text-center py-10 flex flex-col items-center justify-center">
            <CreditCard className="h-10 w-10 text-indigo-400/60 mb-2 animate-pulse" />
            <h3 className="text-xs font-bold text-white">No Active Credit Cards</h3>
            <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
              Cards will automatically appear here once you complete a successful bill payment. Only the last 4 successful cards are shown.
            </p>
          </div>
        ) : (
          <div
            ref={sliderRef}
            className="flex gap-4 overflow-x-auto pb-3 scroll-smooth snap-x snap-mandatory scrollbar-none"
            style={{ scrollbarWidth: 'none' }}
          >
            {finalCards.map((card) => {
              const txs = userBills
                .filter((b) => {
                  const cardNum = b.card_number || '';
                  const bank = b.bank_name || '';
                  return cardNum.replace(/\s/g, '').endsWith(card.last4) || 
                         bank.toLowerCase().includes(card.id);
                })
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 4);

              const isFlipped = !!flippedCards[card.id];

              return (
                <div
                  key={card.id}
                  className="w-[300px] max-w-[85vw] shrink-0 snap-start select-none h-48 card-container cursor-pointer"
                  onClick={() => toggleFlip(card.id)}
                >
                  <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
                    
                    {/* Front Face */}
                    <div className={`card-front p-4 rounded-2xl ${card.gradientClass} border ${card.borderClass} shadow-2xl flex flex-col justify-between w-full h-full`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase ${card.textClass} tracking-wider truncate max-w-[70%]`}>{card.name}</span>
                        <span className={`font-extrabold text-[11px] ${card.brandColor} italic`}>{card.type}</span>
                      </div>
                      <div>
                        <p className="font-mono text-base text-slate-100 tracking-widest mb-1">{card.number}</p>
                        <div className="flex justify-between items-center text-[9px] text-slate-300 uppercase">
                          <span className="truncate max-w-[75%]">Cardholder: {card.cardholder_name || currentUser?.full_name}</span>
                          <span>Exp: {card.exp}</span>
                        </div>
                        <div className="mt-2 text-center text-[8px] text-slate-400 group-hover:text-slate-300 transition-colors">
                          Click to view recent activity
                        </div>
                      </div>
                    </div>

                    {/* Back Face */}
                    <div className={`card-back p-4 rounded-2xl ${card.gradientClass} border ${card.borderClass} shadow-2xl flex flex-col justify-between w-full h-full relative overflow-hidden`}>
                      {/* Dark glass overlay */}
                      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-[2px] rounded-2xl" />
                      
                      <div className="z-10 flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Recent Activity</span>
                          <span className={`text-[9px] font-mono ${card.textClass}`}>Ends {card.last4}</span>
                        </div>

                        <div className="flex-1 my-1.5 space-y-1 overflow-y-auto pr-0.5">
                          {txs.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-500 text-[9px] py-4 italic">
                              No payments recorded
                            </div>
                          ) : (
                            txs.map((tx) => (
                              <div key={tx.id} className="flex items-center justify-between text-[9px] py-0.5 border-b border-slate-900/40">
                                <div className="flex flex-col">
                                  <span className="text-white font-mono font-bold">₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                                  <span className="text-[7.5px] text-slate-400">
                                    {new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </span>
                                </div>
                                <div>
                                  {tx.status === 'Success' && (
                                    <span className="text-[7.5px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">Success</span>
                                  )}
                                  {tx.status === 'Pending' && (
                                    <span className="text-[7.5px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold animate-pulse">Pending</span>
                                  )}
                                  {tx.status === 'Failed' && (
                                    <span className="text-[7.5px] px-1 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">Failed</span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="text-center text-[7.5px] text-slate-500 border-t border-slate-900/60 pt-0.5">
                          Click to flip card
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


    </div>
  );
};
