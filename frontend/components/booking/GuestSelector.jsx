'use client';
import { useState } from 'react';

export default function GuestSelector({ maxGuests, onChange, initialValues = {} }) {
  const [adults, setAdults] = useState(initialValues.adults || 1);
  const [children, setChildren] = useState(initialValues.children || 0);
  const [infants, setInfants] = useState(initialValues.infants || 0);
  const [isOpen, setIsOpen] = useState(false);
  const max = maxGuests || 16;

  const update = (type, val) => {
    if(val<0) return;
    let na=adults, nc=children, ni=infants;
    if(type==='adults'){ if(val<1||val+children>max) return; na=val; setAdults(val); }
    else if(type==='children'){ if(val+adults>max) return; nc=val; setChildren(val); }
    else { if(val>5) return; ni=val; setInfants(val); }
    if(onChange) onChange({ adults:na, children:nc, infants:ni, total:na+nc });
  };

  return (
    <div className="guest-selector">
      <button className="guest-selector__trigger" onClick={()=>setIsOpen(!isOpen)} type="button" aria-expanded={isOpen}>
        <span className="guest-selector__label">{adults+children} guest{adults+children!==1?'s':''}{infants>0?`, ${infants} infant${infants>1?'s':''}`:''}</span>
      </button>
      {isOpen && (
        <div className="guest-selector__dropdown">
          {[{t:'Adults',d:'Ages 13+',v:adults,min:1,max:max-adults-children+adults},{t:'Children',d:'Ages 2-12',v:children,min:0,max:max-adults},{t:'Infants',d:'Under 2',v:infants,min:0,max:5}].map(r=>(
            <div key={r.t} className="guest-selector__row">
              <div className="guest-selector__info"><span className="guest-selector__type">{r.t}</span><span className="guest-selector__description">{r.d}</span></div>
              <div className="guest-selector__controls">
                <button className="guest-selector__btn" onClick={()=>update(r.t.toLowerCase(),r.v-1)} disabled={r.v<=r.min} type="button">-</button>
                <span className="guest-selector__count">{r.v}</span>
                <button className="guest-selector__btn" onClick={()=>update(r.t.toLowerCase(),r.v+1)} disabled={r.v>=r.max} type="button">+</button>
              </div>
            </div>
          ))}
          <button className="guest-selector__close" onClick={()=>setIsOpen(false)} type="button">Done</button>
        </div>
      )}
    </div>
  );
}
