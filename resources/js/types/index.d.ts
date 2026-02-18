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
};

export type AccountStatus = 'active' | 'inactive' | 'pending';
export type InvoiceStatus = 'unpaid' | 'pending' | 'paid' | 'overdue';
export type SmsStatus     = 'sent' | 'failed';

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

    // Relations
    invoices?: Invoice[];
    patient_insurances?: PatientInsurance[];
    patient_authorizations?: PatientAuthorization[];
    encounters?: Encounter[];
}

export interface Invoice {
    id: number;
    client_id: number;
    client?: Client;
    invoice_number: string;
    service_date: string;
    amount_due: number;
    amount_paid: number;
    status: InvoiceStatus;
    notes: string | null;
    stripe_payment_link: string | null;
    stripe_checkout_session_id: string | null;
    created_at: string;
    updated_at: string;
    sms_logs?: SmsLog[];
}

export interface SmsLog {
    id: number;
    invoice_id: number;
    sent_at: string;
    status: SmsStatus;
    message_sid: string | null;
    error_message: string | null;
}

export interface DashboardStats {
    total_outstanding: number;
    total_collected_this_month: number;
    recent_payments: (Invoice & { client: Client })[];
    needs_action_count: number;
    // Extended stats
    total_clients: number;
    total_invoices: number;
    overdue_amount: number;
    status_counts: Partial<Record<InvoiceStatus, number>>;
    needs_action_invoices: (Invoice & { client: Client })[];
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
