export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition<
  Row,
  Insert,
  Update,
  Relationships extends {
    foreignKeyName: string;
    columns: string[];
    isOneToOne: boolean;
    referencedRelation: string;
    referencedColumns: string[];
  }[] = [],
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

type Timestamped = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        {
          user_id: string;
          full_name: string;
          avatar_url: string | null;
        } & Timestamped,
        {
          user_id: string;
          full_name?: string;
          avatar_url?: string | null;
        },
        {
          full_name?: string;
          avatar_url?: string | null;
          updated_at?: string;
        }
      >;
      user_roles: TableDefinition<
        {
          id: string;
          user_id: string;
          role:
            | "customer"
            | "admin"
            | "super_admin"
            | "inventory_manager"
            | "order_manager"
            | "delivery_manager"
            | "delivery_staff";
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          role:
            | "customer"
            | "admin"
            | "super_admin"
            | "inventory_manager"
            | "order_manager"
            | "delivery_manager"
            | "delivery_staff";
          created_at?: string;
        },
        {
          role?:
            | "customer"
            | "admin"
            | "super_admin"
            | "inventory_manager"
            | "order_manager"
            | "delivery_manager"
            | "delivery_staff";
        }
      >;
      orders: TableDefinition<
        {
          id: string;
          order_number: string;
          user_id: string;
          status: string;
          currency: string;
          total: number;
          created_at: string;
        },
        never,
        { status?: string }
      >;
      categories: TableDefinition<
        {
          id: string;
          name: string;
          slug: string;
          description: string;
          is_active: boolean;
        } & Timestamped,
        {
          id?: string;
          name: string;
          slug: string;
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        {
          name?: string;
          slug?: string;
          description?: string;
          is_active?: boolean;
          updated_at?: string;
        }
      >;
      products: TableDefinition<
        {
          id: string;
          category_id: string | null;
          sku: string;
          name: string;
          slug: string;
          description: string;
          price: number;
          currency: string;
          image_url: string | null;
          is_active: boolean;
        } & Timestamped,
        {
          id?: string;
          category_id?: string | null;
          sku: string;
          name: string;
          slug: string;
          description?: string;
          price: number;
          currency?: string;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        {
          category_id?: string | null;
          sku?: string;
          name?: string;
          slug?: string;
          description?: string;
          price?: number;
          currency?: string;
          image_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        },
        [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ]
      >;
      inventory: TableDefinition<
        { product_id: string; quantity: number; updated_at: string },
        { product_id: string; quantity?: number; updated_at?: string },
        { quantity?: number; updated_at?: string },
        [
          {
            foreignKeyName: "inventory_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ]
      >;
      product_images: TableDefinition<
        {
          id: string;
          product_id: string;
          storage_path: string;
          image_url: string;
          alt_text: string;
          is_primary: boolean;
          created_at: string;
        },
        {
          id?: string;
          product_id: string;
          storage_path: string;
          image_url: string;
          alt_text?: string;
          is_primary?: boolean;
          created_at?: string;
        },
        {
          storage_path?: string;
          image_url?: string;
          alt_text?: string;
          is_primary?: boolean;
        },
        [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ]
      >;
      addresses: TableDefinition<
        {
          id: string;
          user_id: string;
          label: string;
          recipient_name: string;
          phone: string;
          address_line_1: string;
          address_line_2: string;
          city: string;
          region: string;
          postal_code: string;
          country: string;
          is_default: boolean;
        } & Timestamped,
        {
          id?: string;
          user_id: string;
          label: string;
          recipient_name: string;
          phone?: string;
          address_line_1: string;
          address_line_2?: string;
          city: string;
          region: string;
          postal_code: string;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        {
          label?: string;
          recipient_name?: string;
          phone?: string;
          address_line_1?: string;
          address_line_2?: string;
          city?: string;
          region?: string;
          postal_code?: string;
          country?: string;
          is_default?: boolean;
          updated_at?: string;
        }
      >;
      delivery_staff_profiles: TableDefinition<
        {
          user_id: string;
          email: string;
          full_name: string;
          service_zone: string;
          license_storage_path: string | null;
          license_status: "missing" | "pending" | "approved" | "rejected";
          license_rejection_reason: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          is_active: boolean;
        } & Timestamped,
        {
          user_id: string;
          email: string;
          full_name: string;
          service_zone: string;
          license_storage_path?: string | null;
          license_status?: "missing" | "pending" | "approved" | "rejected";
          license_rejection_reason?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        {
          email?: string;
          full_name?: string;
          service_zone?: string;
          license_storage_path?: string | null;
          license_status?: "missing" | "pending" | "approved" | "rejected";
          license_rejection_reason?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          is_active?: boolean;
          updated_at?: string;
        }
      >;
    };
    Views: {
      product_stock_status: {
        Row: { product_id: string; in_stock: boolean };
        Relationships: [];
      };
    };
    Functions: {
      set_default_address: {
        Args: { p_address_id: string };
        Returns: undefined;
      };
      set_primary_product_image: {
        Args: {
          p_product_id: string;
          p_storage_path: string;
          p_image_url: string;
          p_alt_text: string;
        };
        Returns: string;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      has_role: {
        Args: { p_roles: string[] };
        Returns: boolean;
      };
      get_my_cart: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_trending_product_ids: {
        Args: { p_limit?: number };
        Returns: { product_id: string }[];
      };
      get_my_wishlist: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      add_to_wishlist: {
        Args: { p_product_id: string };
        Returns: Json;
      };
      remove_from_wishlist: {
        Args: { p_product_id: string };
        Returns: Json;
      };
      subscribe_newsletter: {
        Args: { p_email: string };
        Returns: boolean;
      };
      add_cart_item: {
        Args: { p_product_id: string; p_quantity: number };
        Returns: Json;
      };
      set_cart_item_quantity: {
        Args: { p_item_id: string; p_quantity: number };
        Returns: Json;
      };
      remove_cart_item: {
        Args: { p_item_id: string };
        Returns: Json;
      };
      checkout_cart: {
        Args: {
          p_address_id: string;
          p_payment_method: string;
          p_idempotency_key: string;
          p_simulated_result: string;
        };
        Returns: Json;
      };
      retry_simulated_payment: {
        Args: {
          p_order_id: string;
          p_idempotency_key: string;
          p_simulated_result: string;
        };
        Returns: Json;
      };
      get_my_orders: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_admin_dashboard: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      admin_update_order_status: {
        Args: { p_order_id: string; p_status: string };
        Returns: Json;
      };
      admin_delete_product: {
        Args: { p_product_id: string };
        Returns: string[];
      };
      get_my_order: {
        Args: { p_order_id: string };
        Returns: Json;
      };
      get_my_payment: {
        Args: { p_payment_id: string };
        Returns: Json;
      };
      submit_delivery_license: {
        Args: { p_storage_path: string };
        Returns: Json;
      };
      get_my_delivery_dashboard: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_admin_delivery_queue: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_assignable_delivery_staff: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      admin_assign_delivery: {
        Args: { p_order_id: string; p_delivery_staff_id: string };
        Returns: Json;
      };
      admin_update_delivery_staff: {
        Args: {
          p_delivery_staff_id: string;
          p_service_zone: string;
          p_is_active: boolean;
        };
        Returns: Json;
      };
      admin_review_delivery_license: {
        Args: {
          p_delivery_staff_id: string;
          p_decision: string;
          p_rejection_reason?: string;
        };
        Returns: Json;
      };
      update_assigned_delivery_status: {
        Args: {
          p_delivery_id: string;
          p_status: string;
          p_note?: string;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
