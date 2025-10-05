/*
 * Frontend Types for Supply Chain DApp
 * Matches chaincode types but optimized for React components
 */

// User roles in the supply chain
export type Role = 'producer' | 'factory' | 'retailer' | 'consumer';

// Asset interfaces (matching chaincode)
export interface Asset {
  id: string;
  name: string;
  description?: string;
  type: 'RAW_MATERIAL' | 'PRODUCT';
  category?: string;
  status: 'CREATED' | 'IN_TRANSIT' | 'MANUFACTURED' | 'CONSUMED' | 'DELIVERED';
  currentOwner: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  // Supply chain specific fields
  origin?: string;
  certifications?: string[];
  expiryDate?: string;
  batchNumber?: string;

  // For products - reference to raw materials
  rawMaterials?: string[];

  // Transfer history
  transfers?: AssetTransfer[];

  // Custom properties
  properties?: { [key: string]: string | number | boolean };
}

export interface AssetTransfer {
  from: string;
  to: string;
  timestamp: string;
  location?: string;
  transportMethod?: string;
  temperature?: number;
  notes?: string;
}

export interface AssetHistory {
  assetId: string;
  action: 'CREATE' | 'UPDATE' | 'TRANSFER' | 'TRANSFORM' | 'DELETE';
  timestamp: string;
  actor: string;
  previousOwner: string;
  newOwner: string;
  data: Record<string, unknown>;
}

// Frontend specific types
export interface User {
  id: string;
  role: Role;
  organization: string;
  mspId: string;
  name: string;
  email?: string;
}

export interface NavigationItem {
  href: string;
  label: string;
  icon?: string;
  role?: Role[];
}

// Form interfaces for each role
export interface CreateAssetForm {
  name: string;
  description: string;
  type: 'RAW_MATERIAL' | 'PRODUCT';
  category: string;
  origin: string;
  batchNumber: string;
  expiryDate: string;
  certifications: string[];
  properties: { [key: string]: string | number | boolean };
}

export interface TransferAssetForm {
  assetId: string;
  newOwner: string;
  location: string;
  transportMethod: string;
  temperature?: number;
  notes: string;
}

export interface TransformAssetForm {
  rawMaterialIds: string[];
  productName: string;
  productDescription: string;
  category: string;
  batchNumber: string;
  expiryDate: string;
  properties: { [key: string]: string | number | boolean };
}

// API Response types
export interface ChainCodeResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  txId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}