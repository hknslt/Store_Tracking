// src/components/TurkeyMap.tsx
import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from "react-simple-maps";
import { geoCentroid } from "d3-geo";

// Harita Verileri
const TURKEY_TOPO_URL = "https://code.highcharts.com/mapdata/countries/tr/tr-all.topo.json";
const CYPRUS_TOPO_URL = "https://code.highcharts.com/mapdata/countries/cy/cy-all.topo.json";

interface CityData {
    count: number;
    revenue: number;
}

interface TurkeyMapProps {
    cityData: Record<string, CityData>;
}

const TurkeyMap: React.FC<TurkeyMapProps> = ({ cityData }) => {
    const [tooltip, setTooltip] = useState<{ name: string, data: CityData | null, x: number, y: number } | null>(null);
    const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

    useEffect(() => {
        const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
    };

    // 🔥 1. YARDIMCI: İsim Temizleme / Normalleştirme Fonksiyonu
    // Türkçe karakterleri ve boşlukları temizler (Örn: "Şanlıurfa" -> "sanliurfa")
    const cleanName = (name: string) => {
        return name
            .toLocaleLowerCase('tr')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9]/g, ''); // Harf ve rakam dışındakileri sil
    };

    // 🔥 2. GÜNCELLENMİŞ: Şehir Verisi Eşleştirme
    const getCityStats = (geoName: string): CityData | null => {
        if (!geoName) return null;

        const mapNameClean = cleanName(geoName);

        // Veritabanındaki key'ler arasında dönüp eşleşme arıyoruz
        const key = Object.keys(cityData).find(dbCityName => {
            const dbNameClean = cleanName(dbCityName);

            // 1. Tam Eşleşme (sanliurfa === sanliurfa)
            if (dbNameClean === mapNameClean) return true;

            // 2. Kapsama (afyonkarahisar 'afyon' içeriyor mu? Veya tam tersi)
            // Harita ismi genelde daha uzundur (Afyonkarahisar), DB ismi kısa olabilir (Afyon)
            if (mapNameClean.includes(dbNameClean) || dbNameClean.includes(mapNameClean)) return true;

            return false;
        });

        return key ? cityData[key] : null;
    };

    const handleMouseEnter = (event: React.MouseEvent<SVGPathElement, MouseEvent>, geoName: string) => {
        const { clientX, clientY } = event;
        const stats = getCityStats(geoName);

        setTooltip({
            name: geoName,
            data: stats,
            x: clientX,
            y: clientY
        });
    };

    const getTooltipStyle = () => {
        if (!tooltip) return {};
        let top = tooltip.y + 10;
        let left = tooltip.x + 10;

        if (tooltip.y > windowSize.h - 150) top = tooltip.y - 100;
        if (tooltip.x > windowSize.w - 220) left = tooltip.x - 210;

        return {
            position: "fixed" as const,
            top: top,
            left: left,
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            color: "white",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 500,
            pointerEvents: "none" as const,
            zIndex: 9999,
            whiteSpace: "nowrap" as const,
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(4px)"
        };
    };

    return (
        <div style={{ width: "100%", height: "100%", position: "relative", backgroundColor: "#f8fafc", borderRadius: "16px", overflow: "hidden" }}>

            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: 3000,
                    center: [35, 38]
                }}
                style={{ width: "100%", height: "100%" }}
            >
                <ZoomableGroup zoom={1} minZoom={1} maxZoom={3}>

                    {/* 1. KATMAN: TÜRKİYE */}
                    <Geographies geography={TURKEY_TOPO_URL}>
                        {({ geographies }: { geographies: any[] }) =>
                            geographies.map((geo: any) => {
                                const cityName = geo.properties.name;
                                const stats = getCityStats(cityName);
                                const isActive = stats && stats.count > 0;
                                const centroid = geoCentroid(geo);

                                // DEBUG İÇİN: Eğer boyanmayan şehir varsa konsoldan adını görebilirsiniz
                                // if (cityName === 'Istanbul') console.log('Harita:', cityName, 'Stats:', stats);

                                return (
                                    <React.Fragment key={geo.rsmKey}>
                                        <Geography
                                            geography={geo}
                                            onMouseEnter={(e: any) => handleMouseEnter(e, cityName)}
                                            onMouseLeave={() => setTooltip(null)}
                                            style={{
                                                default: {
                                                    fill: isActive ? "#15954d" : "#e2e8f0",
                                                    stroke: "#fff",
                                                    strokeWidth: 0.5,
                                                    outline: "none",
                                                    transition: "all 0.3s"
                                                },
                                                hover: {
                                                    fill: isActive ? "#145a32" : "#94a3b8",
                                                    stroke: "#fff",
                                                    strokeWidth: 1,
                                                    outline: "none",
                                                    cursor: "pointer"
                                                },
                                                pressed: { fill: "#145a32", outline: "none" }
                                            }}
                                        />
                                        <Marker coordinates={centroid}>
                                            <text
                                                y="2"
                                                fontSize={8}
                                                textAnchor="middle"
                                                fill={isActive ? "#ffffff" : "#475569"}
                                                style={{ pointerEvents: 'none', fontWeight: isActive ? 'bold' : 'normal' }}
                                            >
                                                {cityName}
                                            </text>
                                        </Marker>
                                    </React.Fragment>
                                );
                            })
                        }
                    </Geographies>

                    {/* 2. KATMAN: KIBRIS */}
                    <Geographies geography={CYPRUS_TOPO_URL}>
                        {({ geographies }: { geographies: any[] }) =>
                            geographies.map((geo: any) => {
                                // Kıbrıs için özel kontrol (Haritada bölge isimleri farklı olabilir)
                                const possibleNames = ["Kıbrıs", "KKTC", "Lefkoşa", "Girne", "Gazimağusa", "Northern Cyprus"];

                                // Haritadaki bölge ismini de kontrol et
                                const mapGeoName = geo.properties.name;

                                // Önce harita ismine göre bak, yoksa genel isimlere bak
                                let stats = getCityStats(mapGeoName);
                                let displayAndLookupName = mapGeoName;

                                if (!stats) {
                                    const matchedName = possibleNames.find(name => getCityStats(name) !== null);
                                    if (matchedName) {
                                        displayAndLookupName = matchedName;
                                        stats = getCityStats(matchedName);
                                    } else {
                                        displayAndLookupName = "Kıbrıs";
                                    }
                                }

                                const isActive = stats && stats.count > 0;
                                const centroid = geoCentroid(geo);

                                return (
                                    <React.Fragment key={geo.rsmKey}>
                                        <Geography
                                            geography={geo}
                                            onMouseEnter={(e: any) => handleMouseEnter(e, displayAndLookupName)}
                                            onMouseLeave={() => setTooltip(null)}
                                            style={{
                                                default: {
                                                    fill: isActive ? "#15954d" : "#e2e8f0",
                                                    stroke: "#fff",
                                                    strokeWidth: 0.5,
                                                    outline: "none",
                                                    transition: "all 0.3s"
                                                },
                                                hover: {
                                                    fill: isActive ? "#145a32" : "#94a3b8",
                                                    stroke: "#fff",
                                                    strokeWidth: 1,
                                                    outline: "none",
                                                    cursor: "pointer"
                                                },
                                                pressed: { fill: "#145a32", outline: "none" }
                                            }}
                                        />
                                        <Marker coordinates={centroid}>
                                            <text y="2" fontSize={8} textAnchor="middle" fill="#475569" style={{ pointerEvents: 'none' }}>
                                                {displayAndLookupName}
                                            </text>
                                        </Marker>
                                    </React.Fragment>
                                );
                            })
                        }
                    </Geographies>

                </ZoomableGroup>
            </ComposableMap>

            {tooltip && (
                <div style={getTooltipStyle()}>
                    <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {tooltip.name}
                    </div>

                    {tooltip.data ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8', fontSize: '11px' }}>Mağaza Sayısı</span>
                                <strong style={{ color: '#4ade80' }}>{tooltip.data.count}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8', fontSize: '11px' }}>Anlık Kasa</span>
                                <strong style={{ color: '#fbbf24' }}>{formatCurrency(tooltip.data.revenue)}</strong>
                            </div>
                        </div>
                    ) : (
                        <div style={{ opacity: 0.6, fontStyle: 'italic', fontSize: '11px' }}>Mağaza Bulunmuyor</div>
                    )}
                </div>
            )}

            <div style={{ position: 'absolute', bottom: '10px', right: '15px', fontSize: '10px', color: '#94a3b8', background: 'rgba(255,255,255,0.8)', padding: '4px 8px', borderRadius: '4px', backdropFilter: 'blur(2px)' }}>
                🖱️ Yakınlaşmak için çift tıklayın
            </div>
        </div>
    );
};

export default TurkeyMap;