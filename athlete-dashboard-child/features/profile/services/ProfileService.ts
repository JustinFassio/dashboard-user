import { ProfileData, ProfileErrorCode } from '../types/profile';
import { ProfileConfig, getFullEndpointUrl } from '../config';

export class ProfileError extends Error {
    constructor(
        public readonly details: {
            code: ProfileErrorCode;
            message: string;
            status?: number;
        }
    ) {
        super(details.message);
        this.name = 'ProfileError';
    }
}

export class ProfileService {
    private readonly apiUrl: string;
    private readonly nonce: string;
    private currentUserData: ProfileData | null = null;

    // Field groups for data validation
    private readonly CORE_FIELDS = [
        'username',
        'email',
        'displayName',
        'firstName',
        'lastName'
    ] as const;

    private readonly EXTENDED_FIELDS = [
        'nickname',
        'roles'
    ] as const;

    constructor(apiUrl: string, nonce: string) {
        this.apiUrl = apiUrl.replace(/\/$/, '');
        this.nonce = nonce;
        console.log('ProfileService initialized with:', {
            apiUrl: this.apiUrl,
            noncePresent: !!nonce
        });
    }

    public async fetchProfile(userId: number): Promise<ProfileData> {
        try {
            console.group('ProfileService: fetchProfile');
            console.log('Fetching profile for user:', userId);
            
            const endpoint = `${this.apiUrl}/athlete-dashboard/v1/profile/user`;
                
            console.log('API URL:', endpoint);
            console.log('Headers:', {
                'X-WP-Nonce': this.nonce ? '[PRESENT]' : '[MISSING]'
            });
            
            const response = await fetch(endpoint, {
                headers: {
                    'X-WP-Nonce': this.nonce,
                    'Accept': 'application/json'
                }
            });

            console.log('Profile fetch response status:', response.status);
            const responseText = await response.text();
            console.log('Raw response:', responseText);

            if (!response.ok) {
                if (response.status === 404) {
                    console.error('Profile endpoint not found. Please ensure the WordPress REST API route is registered.');
                }
                throw new ProfileError({
                    code: 'NETWORK_ERROR',
                    message: `Failed to fetch profile data: ${response.status} ${response.statusText}`,
                    status: response.status
                });
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                throw new ProfileError({
                    code: 'NETWORK_ERROR',
                    message: 'Invalid JSON response from server',
                    status: response.status
                });
            }

            const normalizedData = this.normalizeProfileData(data);
            console.log('Normalized profile data:', normalizedData);
            console.groupEnd();
            return normalizedData;
        } catch (error) {
            console.error('Profile fetch error:', error);
            console.groupEnd();
            throw error instanceof ProfileError ? error : new ProfileError({
                code: 'NETWORK_ERROR',
                message: error instanceof Error ? error.message : 'Failed to fetch profile data'
            });
        }
    }

    public async updateProfile(userId: number, data: Partial<ProfileData>): Promise<ProfileData> {
        try {
            console.group('ProfileService: updateProfile');
            console.log('Updating profile for user:', userId);
            
            // Add detailed email logging
            console.group('Profile Update Request');
            console.log('Request Data:', {
                userId,
                email: data.email, // Log email specifically
                emailType: typeof data.email,
                emailExists: 'email' in data,
                fullData: data
            });
            console.groupEnd();
            
            const endpoint = `${this.apiUrl}/${ProfileConfig.endpoints.base}`;
            console.log('API URL:', endpoint);
            console.log('Headers:', {
                'Content-Type': 'application/json',
                'X-WP-Nonce': this.nonce ? '[PRESENT]' : '[MISSING]'
            });

            const denormalizedData = this.denormalizeProfileData(data);
            console.log('Denormalized data for backend:', {
                ...denormalizedData,
                email: denormalizedData.email, // Log email after denormalization
                emailType: typeof denormalizedData.email
            });
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': this.nonce,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(denormalizedData)
            });

            console.log('Profile update response status:', response.status);
            const responseText = await response.text();
            console.log('Raw update response:', responseText);

            if (!response.ok) {
                if (response.status === 404) {
                    console.error('Profile endpoint not found. Please ensure the WordPress REST API route is registered.');
                }
                throw new ProfileError({
                    code: 'NETWORK_ERROR',
                    message: `Failed to update profile data: ${response.status} ${response.statusText}`,
                    status: response.status
                });
            }

            let updatedData;
            try {
                updatedData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                throw new ProfileError({
                    code: 'NETWORK_ERROR',
                    message: 'Invalid JSON response from server',
                    status: response.status
                });
            }

            const normalizedData = this.normalizeProfileData(updatedData);
            console.log('Normalized updated data:', normalizedData);
            console.groupEnd();
            return normalizedData;
        } catch (error) {
            console.error('Profile update error:', error);
            console.groupEnd();
            throw error instanceof ProfileError ? error : new ProfileError({
                code: 'NETWORK_ERROR',
                message: error instanceof Error ? error.message : 'Failed to update profile data'
            });
        }
    }

    private normalizeProfileData(data: any): ProfileData {
        console.group('ProfileService: normalizeProfileData');
        console.log('Raw data received:', data);

        // Extract profile data from the response structure
        const profileData = data.data?.profile || data.data || data;
        console.log('Extracted profile data:', profileData);

        // Detect response format
        const isNewEndpoint = 'user_login' in profileData;
        console.log('[ProfileService] Response format:', 'new');

        // Validate required fields
        const hasRequiredFields = 'user_login' in profileData || 'username' in profileData;
            
        if (!hasRequiredFields) {
            console.error('[ProfileService] Missing required fields in response');
            console.groupEnd();
            throw new ProfileError({
                code: 'INVALID_RESPONSE',
                message: 'Profile data is missing required fields'
            });
        }

        // Log raw field values for debugging
        console.log('Raw field values:', {
            username: {
                user_login: profileData.user_login,
                username: profileData.username
            },
            displayName: {
                display_name: profileData.display_name,
                name: profileData.name,
                displayName: profileData.displayName
            },
            email: {
                user_email: profileData.user_email,
                email: profileData.email
            }
        });

        // Convert string values to appropriate types
        const normalizedData: ProfileData = {
            // Core WordPress fields
            id: Number(profileData.id) || 0,
            username: profileData.user_login || profileData.username || '',
            email: profileData.user_email || profileData.email || '',
            displayName: profileData.display_name || profileData.name || '',
            firstName: profileData.first_name || profileData.firstName || '',
            lastName: profileData.last_name || profileData.lastName || '',
            nickname: profileData.nickname || '',
            roles: Array.isArray(profileData.roles) ? profileData.roles : [],

            // Custom profile fields remain unchanged
            phone: profileData.phone || '',
            age: Number(profileData.age) || 0,
            dateOfBirth: profileData.date_of_birth || '',
            gender: profileData.gender || '',
            dominantSide: profileData.dominant_side || '',
            medicalClearance: Boolean(profileData.medical_clearance),
            medicalNotes: profileData.medical_notes || '',
            emergencyContactName: profileData.emergency_contact_name || '',
            emergencyContactPhone: profileData.emergency_contact_phone || '',
            injuries: Array.isArray(profileData.injuries)
                ? profileData.injuries.map((injury: any) => ({
                      id: injury.id || String(Date.now()),
                      name: injury.name || '',
                      details: injury.details || '',
                      type: injury.type || 'general',
                      description: injury.description || injury.details || '',
                      date: injury.date || new Date().toISOString(),
                      severity: injury.severity || 'medium',
                      isCustom: true,
                      status: injury.status || 'active'
                  }))
                : []
        };

        // Log normalization results for verification
        console.log('Field normalization results:', {
            username: {
                raw: profileData.user_login,
                normalized: normalizedData.username
            },
            displayName: {
                raw: profileData.display_name,
                normalized: normalizedData.displayName
            },
            email: {
                raw: profileData.user_email,
                normalized: normalizedData.email
            }
        });

        // Store the current user data for future reference
        this.currentUserData = normalizedData;
        
        console.log('Final normalized data:', normalizedData);
        console.groupEnd();
        return normalizedData;
    }

    private denormalizeProfileData(data: Partial<ProfileData>): Record<string, any> {
        console.group('ProfileService: denormalizeProfileData');
        
        // Get current email for preservation logic
        const currentEmail = this.currentUserData?.email || '';
        
        // Handle email preservation
        const emailExists = 'email' in data;
        const email = emailExists 
            ? (data.email?.trim() || null)  // Convert empty/whitespace to null
            : currentEmail;
        
        console.log('Email preservation:', {
            inputEmail: data.email,
            inputEmailType: typeof data.email,
            currentEmail,
            emailExists,
            finalEmail: email,
            finalEmailType: typeof email,
            wasPreserved: !emailExists,
            trimmedLength: data.email?.trim().length
        });

        // Convert camelCase to snake_case for backend
        const denormalized: Record<string, any> = {
            id: data.id,
            username: data.username || '',
            email,  // Use preserved or null email
            display_name: data.displayName || '',
            first_name: data.firstName || '',
            last_name: data.lastName || '',

            // Custom profile fields
            phone: data.phone,
            age: data.age,
            date_of_birth: data.dateOfBirth,
            gender: data.gender,
            dominant_side: data.dominantSide,
            medical_clearance: data.medicalClearance,
            medical_notes: data.medicalNotes,
            emergency_contact_name: data.emergencyContactName,
            emergency_contact_phone: data.emergencyContactPhone,
            injuries: data.injuries?.map(injury => ({
                id: injury.id,
                name: injury.name,
                details: injury.details,
                type: injury.type,
                description: injury.description,
                date: injury.date,
                severity: injury.severity,
                status: injury.status
            }))
        };

        // Remove undefined and null values
        Object.keys(denormalized).forEach(key => {
            if (denormalized[key] === undefined || denormalized[key] === null) {
                delete denormalized[key];
            }
        });

        console.log('Denormalized data for backend:', denormalized);
        console.groupEnd();
        return denormalized;
    }
} 