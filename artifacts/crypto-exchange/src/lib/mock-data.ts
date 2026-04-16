export const MOCK_COINS = [
  { symbol: "BTC", name: "Bitcoin", price: 64250.50, change24h: 2.5, volume: "32.5B", marketCap: "1.2T", holding: 0.15 },
  { symbol: "ETH", name: "Ethereum", price: 3180.20, change24h: -1.2, volume: "15.2B", marketCap: "380B", holding: 2.5 },
  { symbol: "BNB", name: "BNB", price: 580.40, change24h: 5.4, volume: "2.1B", marketCap: "85B", holding: 10 },
  { symbol: "SOL", name: "Solana", price: 142.60, change24h: 8.2, volume: "4.5B", marketCap: "65B", holding: 45 },
  { symbol: "ADA", name: "Cardano", price: 0.45, change24h: -0.5, volume: "350M", marketCap: "16B", holding: 0 },
  { symbol: "DOGE", name: "Dogecoin", price: 0.15, change24h: 12.5, volume: "1.2B", marketCap: "22B", holding: 0 },
  { symbol: "XRP", name: "XRP", price: 0.58, change24h: 0.2, volume: "900M", marketCap: "32B", holding: 0 },
  { symbol: "MATIC", name: "Polygon", price: 0.72, change24h: -2.1, volume: "250M", marketCap: "7B", holding: 0 },
  { symbol: "LINK", name: "Chainlink", price: 14.50, change24h: 1.5, volume: "400M", marketCap: "8.5B", holding: 0 },
  { symbol: "DOT", name: "Polkadot", price: 7.20, change24h: 3.2, volume: "180M", marketCap: "4.2B", holding: 0 }
];

export const generateMockCandles = (count = 100) => {
  let currentPrice = 64250;
  const data = [];
  const now = new Date().getTime();
  
  for (let i = count; i >= 0; i--) {
    const time = now - i * 3600000; // hourly
    const change = (Math.random() - 0.5) * 500;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * 200;
    const low = Math.min(open, close) - Math.random() * 200;
    const volume = Math.random() * 1000 + 500;
    
    data.push({
      time,
      dateStr: new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      open,
      high,
      low,
      close,
      volume
    });
    
    currentPrice = close;
  }
  
  return data;
};

export const generateOrderBook = () => {
  const currentPrice = 64250.50;
  const asks = [];
  const bids = [];
  
  let askTotal = 0;
  for (let i = 0; i < 15; i++) {
    const price = currentPrice + (i * 10.5) + Math.random() * 5;
    const amount = +(Math.random() * 2 + 0.01).toFixed(4);
    askTotal += amount;
    asks.push({ price: price.toFixed(2), amount: amount.toFixed(4), total: askTotal.toFixed(4), depth: Math.min((askTotal / 25) * 100, 100) });
  }
  
  let bidTotal = 0;
  for (let i = 0; i < 15; i++) {
    const price = currentPrice - (i * 10.5) - Math.random() * 5;
    const amount = +(Math.random() * 2 + 0.01).toFixed(4);
    bidTotal += amount;
    bids.push({ price: price.toFixed(2), amount: amount.toFixed(4), total: bidTotal.toFixed(4), depth: Math.min((bidTotal / 25) * 100, 100) });
  }
  
  return { asks: asks.reverse(), bids };
};
