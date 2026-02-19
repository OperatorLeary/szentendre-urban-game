export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      routes: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          latitude: number;
          longitude: number;
          radius_m: number;
          qr_code_value: string;
          question_prompt: string;
          expected_answer: string;
          expected_answers: string[] | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          latitude: number;
          longitude: number;
          radius_m?: number;
          qr_code_value: string;
          question_prompt: string;
          expected_answer: string;
          expected_answers?: string[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          latitude?: number;
          longitude?: number;
          radius_m?: number;
          qr_code_value?: string;
          question_prompt?: string;
          expected_answer?: string;
          expected_answers?: string[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      route_locations: {
        Row: {
          id: string;
          route_id: string;
          location_id: string;
          sequence_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          route_id: string;
          location_id: string;
          sequence_index: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          route_id?: string;
          location_id?: string;
          sequence_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "route_locations_route_id_fkey";
            columns: ["route_id"];
            isOneToOne: false;
            referencedRelation: "routes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "route_locations_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      runs: {
        Row: {
          id: string;
          route_id: string;
          device_id: string;
          player_alias: string;
          start_location_id: string | null;
          current_sequence_index: number;
          status: Database["public"]["Enums"]["run_status"];
          started_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          route_id: string;
          device_id: string;
          player_alias: string;
          start_location_id?: string | null;
          current_sequence_index?: number;
          status?: Database["public"]["Enums"]["run_status"];
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          route_id?: string;
          device_id?: string;
          player_alias?: string;
          start_location_id?: string | null;
          current_sequence_index?: number;
          status?: Database["public"]["Enums"]["run_status"];
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "runs_route_id_fkey";
            columns: ["route_id"];
            isOneToOne: false;
            referencedRelation: "routes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "runs_start_location_id_fkey";
            columns: ["start_location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      checkins: {
        Row: {
          id: string;
          run_id: string;
          route_id: string;
          location_id: string;
          sequence_index: number;
          validation_type: Database["public"]["Enums"]["validation_type"];
          validated_at: string;
          gps_lat: number | null;
          gps_lng: number | null;
          detected_distance_m: number | null;
          scanned_qr_token: string | null;
          answer_text: string | null;
          is_answer_correct: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          route_id: string;
          location_id: string;
          sequence_index: number;
          validation_type: Database["public"]["Enums"]["validation_type"];
          validated_at?: string;
          gps_lat?: number | null;
          gps_lng?: number | null;
          detected_distance_m?: number | null;
          scanned_qr_token?: string | null;
          answer_text?: string | null;
          is_answer_correct?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          run_id?: string;
          route_id?: string;
          location_id?: string;
          sequence_index?: number;
          validation_type?: Database["public"]["Enums"]["validation_type"];
          validated_at?: string;
          gps_lat?: number | null;
          gps_lng?: number | null;
          detected_distance_m?: number | null;
          scanned_qr_token?: string | null;
          answer_text?: string | null;
          is_answer_correct?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkins_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkins_route_id_fkey";
            columns: ["route_id"];
            isOneToOne: false;
            referencedRelation: "routes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkins_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      bug_reports: {
        Row: {
          id: string;
          run_id: string | null;
          location_id: string | null;
          gps_lat: number | null;
          gps_lng: number | null;
          detected_distance_m: number | null;
          device_info: string;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          run_id?: string | null;
          location_id?: string | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          detected_distance_m?: number | null;
          device_info: string;
          description: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          run_id?: string | null;
          location_id?: string | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          detected_distance_m?: number | null;
          device_info?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bug_reports_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bug_reports_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      run_status: "active" | "completed" | "abandoned";
      validation_type: "gps" | "qr_override";
    };
    CompositeTypes: Record<string, never>;
  };
}

export type PublicSchema = Database["public"];
export type Tables = PublicSchema["Tables"];
