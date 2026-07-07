'use client';
import { useState, useMemo, useCallback } from 'react';

export default function DatePicker({ checkIn, checkOut, onDateChange, blockedDates = [], minNights, maxNights }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [hoverDate, setHoverDate] = useState(null);
  const [selectionPhase, setSelectionPhase] = useState(checkIn && checkOut ? 'complete' : 'checkIn');
  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const isAvailable = (d) => !blockedSet.has(formatDate(d)) && d >= today;

  const isInRange = (d) => {
    if (!checkIn) return false;
    const end = checkOut || hoverDate;
    if (!end) return false;
    return d > new Date(checkIn) && d < new Date(end);
  };

  const handleClick = useCallback((d) => {
    if (!isAvailable(d)) return;
    const ds = formatDate(d);
    if (selectionPhase === 'checkIn' || selectionPhase === 'complete') {
      onDateChange({ checkIn: ds, checkOut: null });
      setSelectionPhase('checkOut');
    } else {
      if (d <= new Date(checkIn)) { onDateChange({ checkIn: ds, checkOut: null }); setSelectionPhase('checkOut'); }
      else { onDateChange({ checkIn, checkOut: ds }); setSelectionPhase('complete'); }
    }
  }, [checkIn, selectionPhase, onDateChange]);

  const genGrid = (ms) => {
    const fd = new Date(ms.getFullYear(), ms.getMonth(), 1).getDay();
    const dim = new Date(ms.getFullYear(), ms.getMonth()+1, 0).getDate();
    const grid = []; let week = [];
    for (let i=0;i<fd;i++) week.push(null);
    for (let d=1;d<=dim;d++) { week.push(new Date(ms.getFullYear(),ms.getMonth(),d)); if (week.length===7) { grid.push(week); week=[]; } }
    if (week.length>0) { while(week.length<7) week.push(null); grid.push(week); }
    return grid;
  };

  const renderMonth = (ms) => {
    const grid = genGrid(ms);
    return (
      <div className="date-picker__month">
        <h4 className="date-picker__month-title">{MONTHS[ms.getMonth()]} {ms.getFullYear()}</h4>
        <div className="date-picker__weekdays">{DAYS.map(d=><span key={d} className="date-picker__weekday">{d}</span>)}</div>
        <div className="date-picker__days">
          {grid.map((w,wi)=><div key={wi} className="date-picker__week">{w.map((d,di)=>{
            if(!d) return <span key={di} className="date-picker__day date-picker__day--empty"/>;
            const ds=formatDate(d), isCIn=ds===checkIn, isCOut=ds===checkOut, inR=isInRange(d), av=isAvailable(d);
            return <button key={di} className={`date-picker__day ${isCIn?'date-picker__day--checkin':''} ${isCOut?'date-picker__day--checkout':''} ${inR?'date-picker__day--in-range':''} ${!av?'date-picker__day--unavailable':''}`} onClick={()=>handleClick(d)} onMouseEnter={()=>av&&selectionPhase==='checkOut'&&setHoverDate(ds)} onMouseLeave={()=>setHoverDate(null)} disabled={!av} type="button">{d.getDate()}</button>;
          })}</div>)}
        </div>
      </div>
    );
  };

  const nm = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1);
  return (
    <div className="date-picker">
      <div className="date-picker__navigation">
        <button className="date-picker__nav-btn" onClick={()=>setCurrentMonth(new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1))} disabled={currentMonth<=new Date(today.getFullYear(),today.getMonth(),1)} type="button">Prev</button>
        <button className="date-picker__nav-btn" onClick={()=>setCurrentMonth(new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1))} type="button">Next</button>
      </div>
      <div className="date-picker__calendars">{renderMonth(currentMonth)}{renderMonth(nm)}</div>
    </div>
  );
}
