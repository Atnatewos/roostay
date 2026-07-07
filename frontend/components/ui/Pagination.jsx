export default function Pagination({ currentPage, totalPages, onPageChange, siblingCount = 1, showInfo = false }) {
  if (totalPages <= 1) return null;
  const getPageNumbers = () => {
    const totalNums = siblingCount * 2 + 5;
    if (totalPages <= totalNums) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const leftI = Math.max(currentPage - siblingCount, 1), rightI = Math.min(currentPage + siblingCount, totalPages);
    const showLeftE = leftI > 2, showRightE = rightI < totalPages - 1;
    if (!showLeftE && showRightE) return [...Array.from({ length: 3 + 2 * siblingCount }, (_, i) => i + 1), '...', totalPages];
    if (showLeftE && !showRightE) return [1, '...', ...Array.from({ length: 3 + 2 * siblingCount }, (_, i) => totalPages - (3 + 2 * siblingCount) + i + 1)];
    return [1, '...', ...Array.from({ length: rightI - leftI + 1 }, (_, i) => leftI + i), '...', totalPages];
  };
  const pages = getPageNumbers();
  return (<nav className="pagination">{pages.map((p, i) => p === '...' ? <span key={`e${i}`} className="pagination__ellipsis">...</span> : <button key={p} className={`pagination__page ${p === currentPage ? 'pagination__page--active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>)}{showInfo && <span className="pagination__info">Page {currentPage} of {totalPages}</span>}</nav>);
}
