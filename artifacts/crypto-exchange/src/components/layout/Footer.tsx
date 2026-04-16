export default function Footer() {
  return (
    <footer className="bg-background border-t border-border py-8 px-6 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-primary text-primary-foreground p-1 rounded h-6 w-6 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </div>
            <span className="text-lg font-bold">CryptoX</span>
          </div>
          <p className="text-sm text-muted-foreground">
            The world's most advanced cryptocurrency exchange.
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-4 text-foreground">Products</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-primary transition-colors">Spot Trading</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Futures</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Options</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Wallet</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4 text-foreground">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">API Documentation</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Fees</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Trading Rules</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4 text-foreground">Community</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-primary transition-colors">Twitter</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Telegram</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Discord</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Reddit</a></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CryptoX. All rights reserved.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}
