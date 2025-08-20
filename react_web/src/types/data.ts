export interface DataItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface CreateDataRequest {
  title: string;
  description: string;
}

export interface UpdateDataRequest extends CreateDataRequest {
  id: string;
}

export interface DataContextType {
  items: DataItem[];
  isLoading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  createItem: (data: CreateDataRequest) => Promise<boolean>;
  updateItem: (data: UpdateDataRequest) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
}