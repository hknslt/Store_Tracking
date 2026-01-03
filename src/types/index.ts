// src/types/index.ts

export interface Product {
    id?: string; // Firebase otomatik verecek
    groupId: string; // Zorunlu (İlişkisel ID)
    categoryId: string; // Zorunlu (İlişkisel ID)
    productName: string; // Zorunlu
    colorId: string; // Zorunlu
    dimension?: string; // Opsiyonel
    cushionId: string; // Zorunlu (Minder/Yastık bilgisi)
    explanation?: string; // Opsiyonel
    createdAt: Date;
}


export interface Group {
    id?: string;      
    groupName: string; 
}

export interface Category {
    id?: string;
    groupId: string;      
    categoryName: string; 
}

export interface Color {
    id?: string;
    colorName: string; 
}

export interface Dimension {
    id?: string;
    dimensionName: string; 
}

export interface Cushion {
    id?: string;
    cushionName: string;  
}
export interface Price {
    id?: string;
    productId: string; 
    amount: number;    
}