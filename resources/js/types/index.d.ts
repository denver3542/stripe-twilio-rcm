export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    flash: {
        success?: string | null;
        error?: string | null;
    };
};

export type AccountStatus     = 'active' | 'inactive' | 'pending';
export type PaymentStatus     = 'pending' | 'paid' | 'failed' | 'expired';
export type PaymentSmsStatus  = 'not_sent' | 'sent' | 'failed';

export interface PatientInsurance {
    id: number;
    client_id: number;
    type: 'primary' | 'secondary';
    company_name: string | null;
    plan_name: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    zip_code: string | null;
    policy_number: string | null;
    group_number: string | null;
    effective_start_date: string | null;
    effective_end_date: string | null;
    insured_relationship: string | null;
    insured_full_name: string | null;
    insured_id_number: string | null;
}

export interface PatientAuthorization {
    id: number;
    client_id: number;
    auth_number: string | null;
    insurance_plan_name: string | null;
    number_of_visits: number | null;
    number_of_visits_used: number | null;
    contact_fullname: string | null;
    contact_phone: string | null;
    notes: string | null;
    start_date: string | null;
    end_date: string | null;
}

export interface Encounter {
    id: number;
    client_id: number;
    external_encounter_id: string | null;
    procedure_code: string | null;
    procedure_category: string | null;
    diagnosis_code: string | null;
    encounter_date: string | null;
}

export interface Client {
    id: number;
    external_patient_id: string | null;

    // Core (nullable for imported patients)
    name: string | null;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    outstanding_balance: number;
    insurance_info: string | null;
    account_status: AccountStatus;

    // Demographics
    prefix: string | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    suffix: string | null;
    ssn: string | null;
    date_of_birth: string | null;
    gender: string | null;
    medical_record_number: string | null;
    marital_status: string | null;
    employment_status: string | null;
    employer_name: string | null;
    referral_source: string | null;
    insurance_type_name: string | null;

    // Address
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    zip_code: string | null;

    // Phone breakdown
    home_phone: string | null;
    work_phone: string | null;
    mobile_phone: string | null;

    // Care team
    rendering_provider: string | null;
    primary_care_physician: string | null;
    referring_provider: string | null;
    service_location: string | null;
    payer_scenario: string | null;

    // Financial summary
    collection_category: string | null;
    charges: number;
    adjustments: number;
    insurance_payments: number;
    patient_payments: number;
    insurance_balance: number;
    patient_balance: number;

    created_at: string;
    updated_at: string;

    // Computed counts (present when loaded with withCount)
    pending_links_count?: number;

    // Relations
    payment_links?: PaymentLink[];
    patient_insurances?: PatientInsurance[];
    patient_authorizations?: PatientAuthorization[];
    encounters?: Encounter[];
    client_payments?: ClientPayment[];
}

export interface ClientPayment {
    id: number;
    client_id: number;
    amount_paid: number;
    stripe_session_id: string;
    stripe_payment_link_id: string | null;
    paid_at: string;
    created_at: string;
    updated_at: string;
}

export interface PaymentLink {
    id: number;
    client_id: number;
    stripe_payment_link_url: string | null;
    stripe_payment_link_id: string | null;
    amount: string;
    description: string | null;
    payment_status: PaymentStatus;
    sms_status: PaymentSmsStatus;
    sms_sent_at: string | null;
    paid_at: string | null;
    created_at: string;
    client?: Client;
}

export interface DashboardStats {
    total_outstanding: number;
    total_paid_this_month: number;
    recent_paid: (PaymentLink & { client: Client })[];
    pending_count: number;
    total_clients: number;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginatedData<T> {
    data: T[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}
