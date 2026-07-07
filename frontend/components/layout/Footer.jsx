import Link from 'next/link';
import constants from '@/lib/constants';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container footer__container">
        <div className="footer__column footer__column--brand">
          <Link href="/" className="footer__logo"><span className="footer__logo-text">ROOSTAY</span></Link>
          <p className="footer__description">Find your perfect stay in Ethiopia. Short-term getaways and long-term rentals across the country.</p>
          <p className="footer__copyright">&copy; {year} ROOSTAY. All rights reserved.</p>
        </div>
        <div className="footer__column">
          <h3 className="footer__heading">Explore</h3>
          <ul className="footer__links">
            <li><Link href="/listings" className="footer__link">Browse Listings</Link></li>
            <li><Link href="/search" className="footer__link">Search</Link></li>
          </ul>
        </div>
        <div className="footer__column">
          <h3 className="footer__heading">Host</h3>
          <ul className="footer__links">
            <li><Link href="/host/listings/create" className="footer__link">List Your Property</Link></li>
            <li><Link href="/host/dashboard" className="footer__link">Host Dashboard</Link></li>
          </ul>
        </div>
        <div className="footer__column">
          <h3 className="footer__heading">Support</h3>
          <ul className="footer__links">
            <li><Link href="/help" className="footer__link">Help Center</Link></li>
            <li><Link href="/contact" className="footer__link">Contact Us</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer__bottom"><div className="container"><p className="footer__bottom-text">Made for Ethiopia</p></div></div>
    </footer>
  );
}
