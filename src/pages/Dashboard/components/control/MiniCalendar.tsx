// src/pages/Dashboard/components/MiniCalendar.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../firebase';
import { collection, addDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import type { CalendarNote } from '../../../../types';

const MiniCalendar = () => {
    const { currentUser } = useAuth();

    // Gerçek "Bugün"
    const realToday = new Date();

    // Ekranda Gösterilen Ay/Yıl
    const [displayDate, setDisplayDate] = useState(new Date());

    // O ay içinde seçili olan gün
    const [selectedDay, setSelectedDay] = useState(realToday.getDate());

    // Not State'leri
    const [noteText, setNoteText] = useState("");
    const [notes, setNotes] = useState<CalendarNote[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(false);

    // Görüntülenen Takvim Hesaplamaları
    const currentYear = displayDate.getFullYear();
    const currentMonth = displayDate.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Pazartesiden başlat

    // Tarih Anahtarı Üretici (Örn: 2024-05-15)
    const getSelectedDateKey = (day: number) => {
        return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    // Ay Değiştirme Fonksiyonları
    const handlePrevMonth = () => {
        const prev = new Date(currentYear, currentMonth - 1, 1);
        setDisplayDate(prev);
        const daysInPrev = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate();
        if (selectedDay > daysInPrev) setSelectedDay(daysInPrev);
    };

    const handleNextMonth = () => {
        const next = new Date(currentYear, currentMonth + 1, 1);
        setDisplayDate(next);
        const daysInNext = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        if (selectedDay > daysInNext) setSelectedDay(daysInNext);
    };

    const handleGoToToday = () => {
        setDisplayDate(new Date());
        setSelectedDay(realToday.getDate());
    };

    // Firebase'den Notları Çek ve 30 Günlükleri Sil
    useEffect(() => {
        const fetchAndCleanNotes = async () => {
            if (!currentUser) return;
            setLoadingNotes(true);
            try {
                const q = query(collection(db, "calendar_notes"), where("userId", "==", currentUser.uid));
                const snap = await getDocs(q);

                const fetchedNotes: CalendarNote[] = [];
                const deletePromises: Promise<void>[] = [];

                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                snap.forEach(d => {
                    const data = d.data() as CalendarNote;
                    const noteDate = new Date(data.createdAt);

                    if (noteDate < thirtyDaysAgo) {
                        deletePromises.push(deleteDoc(doc(db, "calendar_notes", d.id)));
                    } else {
                        fetchedNotes.push({ ...data, id: d.id });
                    }
                });

                await Promise.all(deletePromises);
                setNotes(fetchedNotes);
            } catch (error) {
                console.error("Notlar çekilemedi:", error);
            } finally {
                setLoadingNotes(false);
            }
        };

        fetchAndCleanNotes();
    }, [currentUser]);

    // Yeni Not Ekle
    const handleAddNote = async () => {
        if (noteText.trim() === "" || !currentUser) return;

        const dateKey = getSelectedDateKey(selectedDay);
        const newNote: CalendarNote = {
            dateKey,
            text: noteText.trim(),
            createdAt: new Date().toISOString(),
            userId: currentUser.uid
        };

        try {
            const docRef = await addDoc(collection(db, "calendar_notes"), newNote);
            setNotes(prev => [...prev, { ...newNote, id: docRef.id }]);
            setNoteText("");
        } catch (error) {
            console.error("Not eklenemedi:", error);
        }
    };

    // Not Sil
    const handleDeleteNote = async (noteId: string) => {
        try {
            await deleteDoc(doc(db, "calendar_notes", noteId));
            setNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (error) {
            console.error("Not silinemedi:", error);
        }
    };

    // Seçili günün verileri
    const selectedDayNotes = notes.filter(n => n.dateKey === getSelectedDateKey(selectedDay));
    const selectedFullDate = new Date(currentYear, currentMonth, selectedDay);

    // Görüntülenen ayın mevcut ay olup olmadığını kontrol et (Bugüne Dön butonu için)
    const isCurrentMonthView = currentYear === realToday.getFullYear() && currentMonth === realToday.getMonth();

    return (
        <div className="card" style={{ padding: '20px', background: 'white' }}>

            {/* ÜST KISIM (AY GEÇİŞİ VE SEÇİLİ GÜN BİLGİSİ) */}
            <div style={{ textAlign: 'center', marginBottom: '15px', position: 'relative' }}>

                {/* SOL OK */}
                <button onClick={handlePrevMonth} style={{ position: 'absolute', left: 0, top: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>

                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {displayDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                </div>

                <div style={{ fontSize: '42px', fontWeight: '800', lineHeight: '1', color: '#1e293b', marginTop: '5px' }}>
                    {selectedDay}
                </div>

                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '5px' }}>
                    {selectedFullDate.toLocaleDateString('tr-TR', { weekday: 'long' })}
                </div>

                {/* SAĞ OK */}
                <button onClick={handleNextMonth} style={{ position: 'absolute', right: 0, top: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>

                {/* BUGÜNE DÖN BUTONU */}
                {!isCurrentMonthView && (
                    <div style={{ marginTop: '10px' }}>
                        <button onClick={handleGoToToday} style={{ background: '#f1f5f9', border: 'none', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#3b82f6', cursor: 'pointer' }}>
                            Bugüne Dön
                        </button>
                    </div>
                )}
            </div>

            {/* TAKVİM GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginBottom: '15px' }}>
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => <div key={d} style={{ fontWeight: 'bold', paddingBottom: '5px' }}>{d}</div>)}

                {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`e-${i}`}></div>)}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;

                    // Bu gün gerçekten bugün mü?
                    const isRealToday = dayNum === realToday.getDate() && currentMonth === realToday.getMonth() && currentYear === realToday.getFullYear();
                    // Kullanıcının seçtiği gün mü?
                    const isSelected = dayNum === selectedDay;

                    const dateKey = getSelectedDateKey(dayNum);
                    const dayNotesCount = notes.filter(n => n.dateKey === dateKey).length;

                    return (
                        <div
                            key={dayNum}
                            onClick={() => setSelectedDay(dayNum)}
                            style={{
                                padding: '6px 0',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                position: 'relative',
                                // Eğer hem bugün hem seçiliyse veya sadece bugünse Kırmızı. Sadece seçiliyse Gri.
                                background: isRealToday ? '#dc2626' : isSelected ? '#f1f5f9' : 'transparent',
                                color: isRealToday ? 'white' : '#1e293b',
                                fontWeight: isRealToday || isSelected ? 'bold' : '500',
                                border: isSelected && !isRealToday ? '1px solid #cbd5e1' : '1px solid transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            {dayNum}

                            {/* Not Göstergesi (Nokta) */}
                            {dayNotesCount > 0 && (
                                <div style={{
                                    position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)',
                                    width: '4px', height: '4px', borderRadius: '50%',
                                    background: isRealToday ? 'white' : '#3b82f6',
                                    boxShadow: dayNotesCount > 1 ? (isRealToday ? '-5px 0 0 white, 5px 0 0 white' : '-5px 0 0 #3b82f6, 5px 0 0 #3b82f6') : 'none'
                                }} />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* NOT ALMA VE LİSTELEME ALANI */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
                        {selectedDay} {displayDate.toLocaleDateString('tr-TR', { month: 'long' })} Notları
                    </span>
                    {loadingNotes && <span style={{ fontSize: '10px', color: '#94a3b8' }}>Yükleniyor...</span>}
                </div>

                {/* Not Listesi (Kaydırmalı) */}
                <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedDayNotes.length === 0 && !loadingNotes ? (
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                            Bu güne ait not bulunmuyor.
                        </div>
                    ) : (
                        selectedDayNotes.map(note => (
                            <div key={note.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                                padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0',
                                borderRadius: '8px', fontSize: '12px', color: '#334155'
                            }}>
                                <span style={{ wordBreak: 'break-word', paddingRight: '10px' }}>{note.text}</span>
                                <button
                                    onClick={() => handleDeleteNote(note.id!)}
                                    title="Notu Sil"
                                    style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', padding: 0, fontWeight: 'bold' }}
                                >
                                    ×
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Yeni Not Ekleme Inputu */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Yeni not ekle..."
                        style={{
                            width: '100%', minHeight: '50px', padding: '10px', borderRadius: '8px',
                            border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none',
                            resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                        }}
                    />
                    <button
                        onClick={handleAddNote}
                        disabled={!noteText.trim()}
                        style={{
                            background: noteText.trim() ? '#3b82f6' : '#94a3b8',
                            color: 'white', border: 'none', padding: '8px',
                            borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                            cursor: noteText.trim() ? 'pointer' : 'not-allowed', transition: '0.2s'
                        }}
                    >
                        + Not Ekle
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MiniCalendar;