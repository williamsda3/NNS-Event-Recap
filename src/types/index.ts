export type FieldType = 'text' | 'number' | 'longtext' | 'url' | 'date' | 'calculated' | 'checkbox' | 'photo_upload';

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  category: 'header' | 'metrics' | 'totals' | 'other';
  sectionId?: string;
  formula?: string;
  options?: string[];
  order: number;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  sections?: FormSection[];
  createdAt: string;
  updatedAt: string;
}

export interface EventEntry {
  id: string;
  projectId: string;
  eventName: string;
  eventDate: string;
  responses: Record<string, string | number>;
  status: 'draft' | 'pending' | 'submitted';
  shareToken: string;
  editDeadline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  libraryName: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  dateRange: string;
  templateId: string;
  clientId: string;
  starred: boolean;
  shareToken: string;
  notifyEmails: string[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_TEMPLATE: FormTemplate = {
  id: 'default-event-recap',
  name: 'Event Recap Template',
  description: 'Standard event recap form for outreach events',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sections: [
    { id: 'event-details', title: 'Event Details', description: 'Basic information about the event.', order: 1 },
    { id: 'metrics-counts', title: 'Metrics & Counts', description: 'Numerical data collected at the event.', order: 2 },
    { id: 'additional-info', title: 'Additional Information', description: 'Photos, comments, and other notes.', order: 3 },
  ],
  fields: [
    { id: 'event_name', label: 'Event Name', type: 'text', required: true, category: 'header', sectionId: 'event-details', order: 1 },
    { id: 'event_date_time', label: 'Event Date and Time', type: 'text', required: true, category: 'header', sectionId: 'event-details', order: 2 },
    { id: 'survey_submissions', label: 'Total Onsite Tablet Survey Submissions', type: 'number', required: false, category: 'metrics', sectionId: 'metrics-counts', order: 3 },
    { id: 'english_spanish_take_ones', label: 'English/Spanish Take Ones Distributed', type: 'number', required: false, category: 'metrics', sectionId: 'metrics-counts', order: 4 },
    { id: 'english_korean_take_ones', label: 'English/Korean Take Ones Distributed', type: 'number', required: false, category: 'metrics', sectionId: 'metrics-counts', order: 5 },
    { id: 'total_take_ones', label: 'Total Take Ones Distributed', type: 'calculated', required: false, category: 'totals', sectionId: 'metrics-counts', formula: 'english_spanish_take_ones + english_korean_take_ones', order: 6 },
    { id: 'interactions_english', label: 'Total Interactions in English', type: 'number', required: false, category: 'metrics', sectionId: 'metrics-counts', order: 7 },
    { id: 'interactions_spanish', label: 'Total Interactions in Spanish', type: 'number', required: false, category: 'metrics', sectionId: 'metrics-counts', order: 8 },
    { id: 'interactions_vietnamese', label: 'Total Interactions in Vietnamese', type: 'number', required: false, category: 'metrics', sectionId: 'metrics-counts', order: 9 },
    { id: 'total_interactions', label: 'Total Number of Interactions', type: 'calculated', required: false, category: 'totals', sectionId: 'metrics-counts', formula: 'interactions_english + interactions_spanish + interactions_vietnamese', order: 10 },
    { id: 'goodie_bags', label: 'Goodie Bags Distributed', type: 'number', required: false, category: 'metrics', sectionId: 'metrics-counts', order: 11 },
    { id: 'photo_album', label: 'Photo Album', type: 'url', required: false, category: 'other', sectionId: 'additional-info', order: 12 },
    { id: 'comments_1', label: 'Event Comments 1', type: 'longtext', required: false, category: 'other', sectionId: 'additional-info', order: 13 },
    { id: 'comments_2', label: 'Event Comments 2', type: 'longtext', required: false, category: 'other', sectionId: 'additional-info', order: 14 },
    { id: 'comments_3', label: 'Event Comments 3', type: 'longtext', required: false, category: 'other', sectionId: 'additional-info', order: 15 },
    { id: 'comments_4', label: 'Event Comments 4', type: 'longtext', required: false, category: 'other', sectionId: 'additional-info', order: 16 }
  ]
};

export const NNS_OUTREACH_TEMPLATE: FormTemplate = {
  id: 'nns-outreach-recap',
  name: 'NNS Outreach Event Recap',
  description: 'Comprehensive outreach event recap form with setup, interactions, conditions, team performance, giveaways, and checkout sections.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sections: [
    { id: 'event-info', title: 'Event Information', order: 1 },
    { id: 'setup-logistics', title: 'Set-Up and Logistics', description: 'Confirm materials, setup quality, and any logistical challenges. This section ensures branding standards were followed and identifies barriers the team experienced.', order: 2 },
    { id: 'interactions-engagement', title: 'Interactions and Engagement', description: 'Capture engagement quality, pledge success, and interaction strategy. This allows management to measure outreach effectiveness and adjust staffing or methods as needed.', order: 3 },
    { id: 'event-conditions', title: 'Event Conditions', description: 'Evaluate event flow, audience, weather impact, and environmental challenges. This helps explain pledge count, foot traffic, and the type of attendees reached.', order: 4 },
    { id: 'team-performance', title: 'Team Performance', description: 'Ensure professionalism, accountability, and quality representation. This helps managers evaluate performance and support staff development.', order: 5 },
    { id: 'giveaways-collateral', title: 'Giveaways and Collateral/Brochures', description: 'Track inventory usage and understand which materials attract community interest. This helps with ordering, budgeting, and future event strategy.', order: 6 },
    { id: 'checkout-final', title: 'Check-Out and Final Steps', description: 'Confirm proper closing, item return, and documentation. Ensure cleanliness, organization, and delivery of all required materials. All should be completed for full compensation.', order: 7 },
    { id: 'photos-upload', title: 'Event Photos', description: 'Upload all event photos including booth setup, crowd shots, team photos, and branding. Photos will be saved to SharePoint and linked to this event recap.', order: 8 },
  ],
  fields: [
    // ── Event Information ──
    { id: 'event_name', label: 'Event Name', type: 'text', required: true, category: 'header', sectionId: 'event-info', order: 1 },
    { id: 'event_location', label: 'Event Location', type: 'text', required: true, category: 'header', sectionId: 'event-info', order: 2 },
    { id: 'event_date', label: 'Event Date', type: 'text', required: true, category: 'header', sectionId: 'event-info', order: 3 },
    { id: 'shift_time', label: 'Shift Time (Start-End)', type: 'text', required: true, category: 'header', sectionId: 'event-info', order: 4 },
    { id: 'team_lead_name', label: 'Team Lead Name', type: 'text', required: true, category: 'header', sectionId: 'event-info', order: 5 },
    { id: 'team_member_name', label: 'Team Member Name', type: 'text', required: true, category: 'header', sectionId: 'event-info', order: 6 },

    // ── Set-Up and Logistics ──
    { id: 'arrival_time', label: 'What time did you arrive at the event?', type: 'text', required: false, category: 'other', sectionId: 'setup-logistics', order: 7 },
    { id: 'check_in_completed', label: 'Was the check-in completed as required?', type: 'checkbox', required: true, category: 'other', sectionId: 'setup-logistics', options: ['Team Lead Checked-in on portal and with an event manager?', 'Team Member Checked-in on portal and with an event manager?'], order: 8 },
    { id: 'required_equipment', label: 'Did you have all required equipment/materials? (Tent, tablecloth, banners, brochures, giveaways, tablets, etc.) If no, explain what was missing.', type: 'longtext', required: false, category: 'other', sectionId: 'setup-logistics', order: 9 },
    { id: 'table_setup_standards', label: 'Was the table/booth setup completed according to program standards? If not, please explain.', type: 'longtext', required: false, category: 'other', sectionId: 'setup-logistics', order: 10 },
    { id: 'weather_space_limitations', label: 'Did weather or space limitations affect the setup? If yes, please explain.', type: 'longtext', required: false, category: 'other', sectionId: 'setup-logistics', order: 11 },
    { id: 'event_access_issues', label: 'Were there any issues with event access? If yes, please explain.', type: 'longtext', required: false, category: 'other', sectionId: 'setup-logistics', order: 12 },
    { id: 'location_of_setup', label: 'Location of Setup (Please be very specific, how far from the main event)', type: 'text', required: false, category: 'other', sectionId: 'setup-logistics', order: 13 },

    // ── Interactions and Engagement ──
    { id: 'demographics_caucasian_white', label: 'Caucasian/White', type: 'number', required: false, category: 'metrics', sectionId: 'interactions-engagement', order: 14 },
    { id: 'demographics_african_american', label: 'African American', type: 'number', required: false, category: 'metrics', sectionId: 'interactions-engagement', order: 15 },
    { id: 'demographics_hispanic', label: 'Hispanic', type: 'number', required: false, category: 'metrics', sectionId: 'interactions-engagement', order: 16 },
    { id: 'demographics_other', label: 'Other', type: 'number', required: false, category: 'metrics', sectionId: 'interactions-engagement', order: 17 },
    { id: 'people_stopped_by', label: 'How many people stopped by the table?', type: 'number', required: false, category: 'metrics', sectionId: 'interactions-engagement', order: 18 },
    { id: 'english_interactions', label: 'English Interactions', type: 'number', required: false, category: 'metrics', sectionId: 'interactions-engagement', order: 19 },
    { id: 'spanish_interactions', label: 'Spanish Interactions', type: 'number', required: false, category: 'metrics', sectionId: 'interactions-engagement', order: 20 },
    { id: 'english_pledges', label: 'English pledges collected', type: 'number', required: false, category: 'metrics', sectionId: 'interactions-engagement', order: 21 },
    { id: 'spanish_pledges', label: 'Spanish pledges collected', type: 'number', required: false, category: 'metrics', sectionId: 'interactions-engagement', order: 22 },
    { id: 'total_cabi_signups', label: 'Total CaBi for All Sign-ups', type: 'number', required: false, category: 'metrics', sectionId: 'interactions-engagement', order: 23 },
    { id: 'community_comment_1', label: 'List 3-5 community comments (questions you were not able to answer, concerns, suggestions, feedback, compliments about the program)', type: 'longtext', required: true, category: 'other', sectionId: 'interactions-engagement', order: 24 },
    { id: 'community_comment_2', label: 'List 3-5 community comments (questions you were not able to answer, concerns, suggestions, feedback, compliments about the program)', type: 'longtext', required: true, category: 'other', sectionId: 'interactions-engagement', order: 25 },
    { id: 'community_comment_3', label: 'List 3-5 community comments (questions you were not able to answer, concerns, suggestions, feedback, compliments about the program)', type: 'longtext', required: true, category: 'other', sectionId: 'interactions-engagement', order: 26 },
    { id: 'community_comment_4', label: 'List 3-5 community comments (questions you were not able to answer, concerns, suggestions, feedback, compliments about the program)', type: 'longtext', required: true, category: 'other', sectionId: 'interactions-engagement', order: 27 },
    { id: 'community_comment_5', label: 'List 3-5 community comments (questions you were not able to answer, concerns, suggestions, feedback, compliments about the program)', type: 'longtext', required: true, category: 'other', sectionId: 'interactions-engagement', order: 28 },
    { id: 'engagement_methods', label: 'How did the team encourage engagement? (Check all that apply)', type: 'checkbox', required: false, category: 'other', sectionId: 'interactions-engagement', options: ['Approaching people outside the set-up/table', 'Trivia Wheel/Plinko', 'Canvassing', 'Giveaways', 'Other strategy'], order: 29 },
    { id: 'other_strategy_explain', label: 'If other strategy, please explain', type: 'text', required: false, category: 'other', sectionId: 'interactions-engagement', order: 30 },

    // ── Event Conditions ──
    { id: 'weather', label: 'Weather', type: 'checkbox', required: false, category: 'other', sectionId: 'event-conditions', options: ['Sunny', 'Rainy', 'Cold', 'Mild/Clear'], order: 31 },
    { id: 'temperature_fahrenheit', label: 'Temperature in Fahrenheit', type: 'number', required: false, category: 'other', sectionId: 'event-conditions', order: 32 },
    { id: 'foot_traffic', label: 'How was foot traffic?', type: 'checkbox', required: false, category: 'other', sectionId: 'event-conditions', options: ['Very busy', 'Steady', 'Moderate', 'Slow'], order: 33 },
    { id: 'crowd_type', label: 'Crowd type (Check all that apply)', type: 'checkbox', required: false, category: 'other', sectionId: 'event-conditions', options: ['Families with kids', 'Adults', 'Teens', 'Seniors', 'Mixed'], order: 34 },
    { id: 'language_needs', label: 'Were there any language needs?', type: 'longtext', required: false, category: 'other', sectionId: 'event-conditions', order: 35 },
    { id: 'environment_suitable', label: 'Was the environment suitable for engagement? (noise, crowd flow, weather, etc.)', type: 'longtext', required: false, category: 'other', sectionId: 'event-conditions', order: 36 },
    { id: 'extenuating_circumstances', label: 'Any Extenuating Circumstances?', type: 'longtext', required: false, category: 'other', sectionId: 'event-conditions', order: 37 },
    { id: 'prevented_reaching_goals', label: 'What prevented the team from reaching goals?', type: 'longtext', required: false, category: 'other', sectionId: 'event-conditions', order: 38 },

    // ── Team Performance ──
    { id: 'correct_uniform', label: 'Did all team members wear the correct uniform?', type: 'text', required: false, category: 'other', sectionId: 'team-performance', order: 39 },
    { id: 'quality_photos', label: 'Did each member take at least 10 quality photos?', type: 'text', required: true, category: 'other', sectionId: 'team-performance', order: 40 },
    { id: 'team_member_performance', label: 'Describe how each team member performed during the event.', type: 'longtext', required: true, category: 'other', sectionId: 'team-performance', order: 41 },
    { id: 'performance_issues', label: 'Any issues with team performance or professionalism?', type: 'longtext', required: false, category: 'other', sectionId: 'team-performance', order: 42 },

    // ── Giveaways and Collateral/Brochures ──
    { id: 'most_popular_giveaway', label: 'Which giveaway was the most popular?', type: 'text', required: false, category: 'other', sectionId: 'giveaways-collateral', order: 48 },
    { id: 'giveaway_suggestion', label: 'Was there a request or suggestion for a specific giveaway?', type: 'text', required: false, category: 'other', sectionId: 'giveaways-collateral', order: 49 },
    { id: 'ran_out_of_item', label: 'Did you run out of any item? If yes, please explain.', type: 'longtext', required: false, category: 'other', sectionId: 'giveaways-collateral', order: 50 },
    { id: 'all_arlington_va_map', label: 'All Arlington VA Map', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 51 },
    { id: 'can_you_go_car_free', label: 'Can You Go Car Free?', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 52 },
    { id: 'puedes_vivir_sin_auto', label: 'Puedes vivir sin auto? (Can You Go Car Free? SPA)', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 53 },
    { id: 'guaranteed_ride_home', label: 'Guaranteed Ride Home', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 54 },
    { id: 'garantizado_viaja_a_casa', label: 'Garantizado viaja a casa (Guaranteed Ride Home SPA)', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 55 },
    { id: 'transportation_services_eng', label: 'Transportation Services for Older Adults and Persons w/ Disabilities (ENG)', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 56 },
    { id: 'transportation_services_spa', label: 'Servicios de transporte para adultos mayores y personas con discapacidad (SPA)', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 57 },
    { id: 'metro_lift_brochure', label: 'Metro Lift Brochure', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 58 },
    { id: 'tips_for_riding_metro', label: 'Tips for Riding Metro', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 59 },
    { id: 'smartrip_charm_card', label: 'SmarTrip Charm Card', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 60 },
    { id: 'metrobus_safety_eng', label: 'Your Guide to Metrobus Safety (ENG)', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 61 },
    { id: 'metrobus_safety_spa', label: 'Su Guía Sobre la Seguridad en Metrobus (SPA)', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 62 },
    { id: 'metrorail_rider_guide', label: 'Metrorail Rider Guide to Emergencies', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 63 },
    { id: 'senior_smartrip', label: 'Senior SmarTrip', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 64 },
    { id: 'all_metro_bus_routes_eng', label: 'All of Metro\'s Bus Routes (ENG)', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 65 },
    { id: 'all_metro_bus_routes_spa', label: 'Todas las rutas de autobús han cambiado (SPA)', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 66 },
    { id: 'trac_media_business_cards', label: 'TRAC Media Business Cards', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 67 },
    { id: 'bike_comfort_level_map', label: 'Bike Comfortable Level Map', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 68 },
    { id: 'cabi_for_all_5_year', label: 'CaBi for All $5/Year', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 69 },
    { id: 'cabi_special_offers', label: 'CaBi Special Offers Free 24hr', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 70 },
    { id: 'cabi_unlock_a_bike', label: 'CaBi Unlock a Bike', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 71 },
    { id: 'shared_mobility_devices', label: 'Shared Mobility Devices', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 72 },
    { id: 'tips_locking_bike', label: 'Tips for Locking your Bike', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 73 },
    { id: 'meet_the_corrals_scooter', label: 'Meet the Corrals/Scooter', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 74 },
    { id: 'adult_bike_classes', label: '$10 Adult Bike Classes (seasonal)', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 75 },
    { id: 'metrobus_routes', label: 'Metrobus Routes', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 76 },
    { id: 'art_routes', label: 'ART Routes', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 77 },
    { id: 'walkabout_maps', label: 'Walkabout Maps', type: 'number', required: false, category: 'metrics', sectionId: 'giveaways-collateral', order: 78 },

    // ── Check-Out and Final Steps ──
    { id: 'team_checkout', label: 'Did the team check-out with the event manager and on the portal?', type: 'text', required: false, category: 'other', sectionId: 'checkout-final', order: 79 },
    { id: 'pictures_uploaded', label: 'Did the team upload the event pictures on the portal?', type: 'text', required: false, category: 'other', sectionId: 'checkout-final', order: 80 },
    { id: 'materials_packed', label: 'Were all materials packed correctly and returned to its designated shelf? If not, please provide details.', type: 'longtext', required: false, category: 'other', sectionId: 'checkout-final', order: 81 },
    { id: 'equipment_damage', label: 'Any damage to equipment or missing item?', type: 'longtext', required: false, category: 'other', sectionId: 'checkout-final', order: 82 },
    { id: 'additional_notes', label: 'Additional notes or anything the manager should be aware of?', type: 'longtext', required: false, category: 'other', sectionId: 'checkout-final', order: 83 },

    // ── Event Photos ──
    { id: 'event_photos', label: 'Upload Event Photos', type: 'photo_upload', required: false, category: 'other', sectionId: 'photos-upload', order: 84 },
  ]
};
