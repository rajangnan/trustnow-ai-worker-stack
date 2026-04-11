// §6.2D-C — Industry and Use Case Enum Validation
// Source of truth for wizard Step 2/Step 3 and agent_templates seeding

export const INDUSTRY_SLUGS = [
  'retail_ecommerce',
  'healthcare_medical',
  'finance_banking',
  'real_estate',
  'education_training',
  'hospitality_travel',
  'automotive',
  'professional_services',
  'technology_software',
  'government_public',
  'food_beverage',
  'manufacturing',
  'fitness_wellness',
  'legal_services',
  'nonprofit',
  'media_entertainment',
  'other',
  'bpo_debt_collections',
  'bpo_utilities',
  'bpo_insurance_claims',
  'bpo_telecoms',
  'bpo_government_services',
] as const;

export type IndustrySlug = typeof INDUSTRY_SLUGS[number];

export const UNIVERSAL_USE_CASES = [
  'customer_support',
  'outbound_sales',
  'learning_development',
  'scheduling',
  'lead_qualification',
  'answering_service',
] as const;

export const INDUSTRY_USE_CASES: Record<IndustrySlug, string[]> = {
  retail_ecommerce:        [...UNIVERSAL_USE_CASES, 'product_recommendations','order_tracking','returns_exchanges','lead_generation','loyalty_programs','other'],
  healthcare_medical:      [...UNIVERSAL_USE_CASES, 'appointment_scheduling','patient_intake','symptom_guidance','insurance_verification','prescription_reminders','telehealth_support','other'],
  finance_banking:         [...UNIVERSAL_USE_CASES, 'account_inquiries','loan_applications','fraud_alerts','investment_guidance','bill_payment_support','financial_planning','other'],
  real_estate:             [...UNIVERSAL_USE_CASES, 'property_search','viewing_appointments','market_information','mortgage_guidance','listing_information','other'],
  education_training:      [...UNIVERSAL_USE_CASES, 'student_enrollment','course_recommendations','tutoring_support','campus_information','career_guidance','learning_companion','other'],
  hospitality_travel:      [...UNIVERSAL_USE_CASES, 'reservation_management','concierge_services','guest_services','travel_planning','loyalty_programs','check_in_support','other'],
  automotive:              [...UNIVERSAL_USE_CASES, 'vehicle_enquiries','test_drive_booking','service_maintenance','parts_accessories','finance_insurance','trade_in_support','other'],
  professional_services:   [...UNIVERSAL_USE_CASES, 'consultation_booking','client_onboarding','project_enquiries','document_collection','invoice_billing','expert_matching','other'],
  technology_software:     [...UNIVERSAL_USE_CASES, 'technical_support','product_demos','api_documentation','user_onboarding','feature_requests','sales_engineering','other'],
  government_public:       [...UNIVERSAL_USE_CASES, 'citizen_services','permit_applications','information_requests','complaint_filing','service_eligibility','emergency_services','other'],
  food_beverage:           [...UNIVERSAL_USE_CASES, 'order_taking','reservation_management','menu_recommendations','delivery_tracking','loyalty_programs','nutritional_information','other'],
  manufacturing:           [...UNIVERSAL_USE_CASES, 'inventory_management','quality_control','maintenance_scheduling','safety_protocols','production_planning','supplier_communication','other'],
  fitness_wellness:        [...UNIVERSAL_USE_CASES, 'class_booking','workout_planning','nutrition_guidance','progress_tracking','membership_management','wellness_coaching','other'],
  legal_services:          [...UNIVERSAL_USE_CASES, 'consultation_scheduling','case_intake','legal_resources','billing_inquiries','document_preparation','case_updates','other'],
  nonprofit:               [...UNIVERSAL_USE_CASES, 'volunteer_coordination','donation_processing','program_information','event_management','beneficiary_support','impact_reporting','other'],
  media_entertainment:     [...UNIVERSAL_USE_CASES, 'content_recommendations','subscription_management','technical_support','event_information','fan_engagement','content_discovery','other'],
  other:                   [...UNIVERSAL_USE_CASES, 'other'],
  bpo_debt_collections:    [...UNIVERSAL_USE_CASES, 'debt_collection_outreach','payment_arrangement','dispute_resolution','skip_tracing_support','regulatory_compliance_scripting','payment_confirmation','other'],
  bpo_utilities:           [...UNIVERSAL_USE_CASES, 'billing_enquiries','outage_reporting','meter_reading_capture','service_connection_disconnection','tariff_switching','payment_plan_setup','other'],
  bpo_insurance_claims:    [...UNIVERSAL_USE_CASES, 'fnol_first_notice_of_loss','claims_status_update','claims_document_collection','claims_triage','settlement_explanation','fraud_referral','other'],
  bpo_telecoms:            [...UNIVERSAL_USE_CASES, 'bill_shock_resolution','contract_upgrade','technical_fault_logging','network_outage_support','roaming_queries','churn_prevention','other'],
  bpo_government_services: [...UNIVERSAL_USE_CASES, 'benefits_eligibility_check','application_status','document_submission_guidance','appointment_booking','complaint_escalation','service_signposting','other'],
};
