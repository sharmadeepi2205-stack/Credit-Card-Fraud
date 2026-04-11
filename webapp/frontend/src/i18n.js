import { usePrefs } from './context/PrefsContext'

export const translations = {
  en: {
    dashboard: 'Dashboard', transactions: 'Transactions', alerts: 'Alerts',
    cards: 'Cards', admin: 'Admin', signOut: 'Sign out',
    activeCards: 'Active Cards', recentTxns: 'Recent Transactions',
    pendingAlerts: 'Pending Alerts', highRisk: 'High Risk Flagged',
    liveAlerts: 'Live Alerts', recentTransactions: 'Recent Transactions',
    noTxns: 'No transactions yet',
    riskLow: 'Low risk', riskMedium: 'Medium risk', riskHigh: 'High risk',
    thisIsMe: 'This is me', blockPayment: 'Block payment', falsePosBtn: 'False positive',
    freezeCard: 'Freeze card', unfreezeCard: 'Unfreeze card',
    unusualActivity: 'Unusual activity on your card',
    securitySummary: 'Security Summary', alertsThisMonth: 'Alerts this month',
    blocked: 'Blocked', confirmedSafe: 'Confirmed safe',
    howSafe: 'How to stay safe', whyBlocked: 'Why was this flagged?',
  },
  hi: {
    dashboard: 'डैशबोर्ड', transactions: 'लेनदेन', alerts: 'अलर्ट',
    cards: 'कार्ड', admin: 'एडमिन', signOut: 'साइन आउट',
    activeCards: 'सक्रिय कार्ड', recentTxns: 'हाल के लेनदेन',
    pendingAlerts: 'लंबित अलर्ट', highRisk: 'उच्च जोखिम',
    liveAlerts: 'लाइव अलर्ट', recentTransactions: 'हाल के लेनदेन',
    noTxns: 'अभी तक कोई लेनदेन नहीं',
    riskLow: 'कम जोखिम', riskMedium: 'मध्यम जोखिम', riskHigh: 'उच्च जोखिम',
    thisIsMe: 'यह मैं हूँ', blockPayment: 'भुगतान रोकें', falsePosBtn: 'गलत अलर्ट',
    freezeCard: 'कार्ड फ्रीज़ करें', unfreezeCard: 'कार्ड अनफ्रीज़ करें',
    unusualActivity: 'आपके कार्ड पर असामान्य गतिविधि',
    securitySummary: 'सुरक्षा सारांश', alertsThisMonth: 'इस महीने अलर्ट',
    blocked: 'अवरुद्ध', confirmedSafe: 'सुरक्षित पुष्टि',
    howSafe: 'सुरक्षित कैसे रहें', whyBlocked: 'यह क्यों फ्लैग हुआ?',
  },
}

// Hook — reads from PrefsContext so re-renders on language change
export function useT() {
  const { prefs } = usePrefs()
  const lang = prefs.lang || 'en'
  return (key) => translations[lang]?.[key] ?? translations.en[key] ?? key
}
