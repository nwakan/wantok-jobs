import { useState, useEffect } from 'react';
import { referrals } from '../api';
import { Gift, Copy, Check, Share2, Users, DollarSign, MessageCircle } from 'lucide-react';

export default function ReferralSection() {
  const [code, setCode] = useState('');
  const [link, setLink] = useState('');
  const [stats, setStats] = useState({ total_referred: 0, completed: 0, total_credits: 0, recent: [] });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      referrals.getMyCode().catch(() => null),
      referrals.getStats().catch(() => null),
    ]).then(([codeData, statsData]) => {
      if (codeData) { setCode(codeData.code); setLink(codeData.link); }
      if (statsData) setStats(statsData);
      setLoading(false);
    });
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareWhatsApp = () => {
    const text = `Join WantokJobs and get 25 free credits! Use my referral link: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-750 rounded-xl shadow-sm border border-orange-200 dark:border-gray-700 overflow-hidden">
      {/* Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center gap-3">
        <Gift className="w-8 h-8 text-white flex-shrink-0" />
        <div>
          <h3 className="text-white font-bold text-lg">Refer a Friend, Earn 50 Credits!</h3>
          <p className="text-orange-100 text-sm">Your friend gets 25 credits too. Win-win!</p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Referral Code + Link */}
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Your Referral Code</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 font-mono text-lg font-bold text-orange-600 dark:text-orange-400 select-all">
              {code}
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{link}</p>
        </div>

        {/* Share Buttons */}
        <div className="flex gap-3">
          <button
            onClick={shareWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
          <button
            onClick={shareFacebook}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <Share2 className="w-4 h-4" />
            Facebook
          </button>
          <button
            onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-600">
            <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_referred}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Referred</div>
          </div>
          <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-600">
            <Check className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Joined</div>
          </div>
          <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-600">
            <DollarSign className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_credits}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Credits Earned</div>
          </div>
        </div>

        {/* Recent Referrals */}
        {stats.recent && stats.recent.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Recent Referrals</h4>
            <div className="space-y-2">
              {stats.recent.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm border border-gray-200 dark:border-gray-600">
                  <span className="text-gray-700 dark:text-gray-300">{r.referred_name || r.referred_email}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.status === 'credited' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                    r.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                  }`}>
                    {r.status === 'credited' ? `+${r.credits_earned} credits` : r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
