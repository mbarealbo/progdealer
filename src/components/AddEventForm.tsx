import React, { useState } from 'react';
import { Plus, X, Check, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import { supabase, classifySubgenre } from '../lib/supabase';
import { PROG_SUBGENRES } from '../types/event';
import PlacesAutocomplete from './PlacesAutocomplete';

interface AddEventFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  onEventAdded: () => void;
  onAuthRequired?: () => void;
  isAuthenticated?: boolean;
}

export default function AddEventForm({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  onEventAdded,
  onAuthRequired,
  isAuthenticated = false,
}: AddEventFormProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [artists, setArtists] = useState<string[]>(['']);
  const [venueCoords, setVenueCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [cityCoords, setCityCoords] = useState<{ lat: number; lng: number } | null>(null);

  const externallyControlled = externalIsOpen !== undefined;
  const isOpen = externallyControlled ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnClose
    ? (value: boolean) => { if (!value) externalOnClose(); }
    : setInternalIsOpen;

  const [formData, setFormData] = useState({
    nome_evento: '',
    data_ora: '',
    venue: '',
    città: '',
    sottogenere: '',
    descrizione: '',
    orario: '',
    link: '',
    immagine: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalSubgenre = formData.sottogenere ||
        classifySubgenre(formData.nome_evento, formData.descrizione, artists.filter((a) => a.trim() !== ''));

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const eventData = {
        nome_evento: formData.nome_evento,
        data_ora: formData.data_ora,
        venue: formData.venue,
        città: formData.città,
        sottogenere: finalSubgenre,
        descrizione: formData.descrizione || null,
        artisti: artists.filter((a) => a.trim() !== ''),
        orario: formData.orario || null,
        link: formData.link || '',
        immagine: formData.immagine?.trim() || null,
        lat: (venueCoords ?? cityCoords)?.lat ?? null,
        lng: (venueCoords ?? cityCoords)?.lng ?? null,
        fonte: 'manual-submission',
        tipo_inserimento: 'manual',
        status: 'pending',
        user_id: user.id,
      };

      const { error } = await supabase.from('eventi_prog').insert([eventData]);
      if (error) throw error;

      // Silent notification to admin — don't block or surface errors to the user
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetch('https://mlnmpfohtsiyjxnjwtkk.supabase.co/functions/v1/notify-albo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              user_email: user.email,
              nome_evento: formData.nome_evento,
              città: formData.città,
              data_ora: formData.data_ora,
            }),
          });
        }
      } catch (notifyErr) {
        console.error('Admin notification failed (silent):', notifyErr);
      }

      setFormData({ nome_evento: '', data_ora: '', venue: '', città: '', sottogenere: '', descrizione: '', orario: '', link: '', immagine: '' });
      setArtists(['']);
      setVenueCoords(null);
      setCityCoords(null);
      setIsOpen(false);
      setShowAdvanced(false);
      setShowSuccess(true);
      onEventAdded();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error adding event:', error);
      let errorMessage = 'Could not submit the show';
      if (error instanceof Error) errorMessage += ': ' + error.message;
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleArtistChange = (index: number, value: string) => {
    const next = [...artists];
    next[index] = value;
    setArtists(next);
  };
  const addArtist = () => setArtists([...artists, '']);
  const removeArtist = (index: number) => { if (artists.length > 1) setArtists(artists.filter((_, i) => i !== index)); };

  if (showSuccess) {
    return (
      <div className="pd-success-toast">
        <span className="ok"><Check size={18} /></span>
        Show submitted — thanks! It's now pending review.
      </div>
    );
  }

  if (!isOpen) {
    if (externallyControlled) return null;
    return (
      <button
        className="btn btn-accent"
        style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50, height: 52, borderRadius: 999, boxShadow: '0 8px 20px -6px rgba(225,52,30,.5)' }}
        onClick={() => { if (!isAuthenticated && onAuthRequired) onAuthRequired(); else setIsOpen(true); }}
        title="Add a show"
      >
        <Plus size={20} /> Add a show
      </button>
    );
  }

  return (
    <div className="pd-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div className="pd-modal" role="dialog" aria-modal="true" aria-label="Add a show">
        <div className="modal-head">
          <h2>Add a show</h2>
          <button className="iconx" onClick={() => setIsOpen(false)} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="modal-sub">Spotted a gig we're missing? Submit it — it goes live after a quick review.</p>

        <form onSubmit={handleSubmit}>
          <div className="afield">
            <label>Event name *</label>
            <input className="ainput" type="text" name="nome_evento" value={formData.nome_evento} onChange={handleChange} required placeholder="e.g. Steven Wilson — Live in London" />
          </div>

          <div className="form-2">
            <div className="afield">
              <label>Date &amp; time *</label>
              <input className="ainput" type="datetime-local" name="data_ora" value={formData.data_ora} onChange={handleChange} required />
            </div>
            <div className="afield">
              <label>City *</label>
              <PlacesAutocomplete value={formData.città} onChange={(v) => setFormData((f) => ({ ...f, città: v }))} onCoords={setCityCoords} cities required placeholder="e.g. London" />
            </div>
          </div>

          <div className="form-2">
            <div className="afield">
              <label>Venue *</label>
              <PlacesAutocomplete value={formData.venue} onChange={(v) => setFormData((f) => ({ ...f, venue: v }))} onCoords={setVenueCoords} required placeholder="Venue name" />
            </div>
            <div className="afield">
              <label>Event link</label>
              <input className="ainput" type="url" name="link" value={formData.link} onChange={handleChange} placeholder="https:// (optional)" />
            </div>
          </div>

          <button type="button" className="adv-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Advanced options
          </button>

          {showAdvanced && (
            <div>
              <div className="form-2">
                <div className="afield">
                  <label>Subgenre</label>
                  <div className="ainput-wrap">
                    <select className="ainput" name="sottogenere" value={formData.sottogenere} onChange={handleChange}>
                      <option value="">Auto-detect from event name</option>
                      {PROG_SUBGENRES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="eye" size={16} style={{ pointerEvents: 'none' }} />
                  </div>
                </div>
                <div className="afield">
                  <label>Time info</label>
                  <input className="ainput" type="text" name="orario" value={formData.orario} onChange={handleChange} placeholder="e.g. Doors 20:00, start 21:00" />
                </div>
              </div>

              <div className="afield">
                <label>Artists</label>
                {artists.map((artist, index) => (
                  <div key={index} className="artist-row">
                    <input className="ainput" type="text" value={artist} onChange={(e) => handleArtistChange(index, e.target.value)} placeholder={`Artist ${index + 1}`} />
                    {artists.length > 1 && (
                      <button type="button" className="mini-btn" onClick={() => removeArtist(index)} aria-label="Remove artist"><Minus size={16} /></button>
                    )}
                  </div>
                ))}
                <button type="button" className="add-artist" onClick={addArtist}><Plus size={15} /> Add artist</button>
              </div>

              <div className="afield">
                <label>Description</label>
                <textarea className="atextarea" name="descrizione" value={formData.descrizione} onChange={handleChange} rows={3} placeholder="What's the show about?" />
              </div>

              <div className="afield">
                <label>Image URL</label>
                <input className="ainput" type="url" name="immagine" value={formData.immagine} onChange={handleChange} placeholder="https:// (optional)" />
                {formData.immagine && (
                  <div className="preview"><img src={formData.immagine} alt="Preview" /></div>
                )}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="ghost" onClick={() => setIsOpen(false)}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <><span className="spin" /> Submitting…</> : 'Submit show'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
