<?php
/**
 * Profile endpoints class.
 *
 * @package AthleteDashboard\Features\Profile\API
 */

namespace AthleteDashboard\Features\Profile\API;

use AthleteDashboard\Core\Config\Debug;
use AthleteDashboard\Features\Profile\Config\Config;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use WP_REST_Server;

/**
 * Class Profile_Endpoints
 *
 * Handles REST API endpoints for managing athlete profiles.
 */
class Profile_Endpoints {
	/**
	 * API namespace for all endpoints.
	 *
	 * @var string
	 */
	const NAMESPACE = 'athlete-dashboard/v1';

	/**
	 * Base route for profile endpoints.
	 *
	 * @var string
	 */
	const ROUTE = 'profile';

	/**
	 * Meta key for storing profile data.
	 *
	 * @var string
	 */
	const META_KEY = '_athlete_profile_data';

	/**
	 * Track if endpoints have been initialized
	 *
	 * @var bool
	 */
	private static $initialized = false;

	/**
	 * Initialize the endpoints.
	 *
	 * Registers all necessary hooks and actions for the profile endpoints.
	 *
	 * @return void
	 */
	public static function init() {
		if ( self::$initialized ) {
			Debug::log( 'Profile endpoints already initialized', 'profile' );
			return;
		}

		Debug::log(
			sprintf( 'Initializing endpoints [namespace=%s, route=%s]', self::NAMESPACE, self::ROUTE ),
			'profile'
		);

		// Register endpoints when WordPress initializes the REST API.
		add_action( 'rest_api_init', array( self::class, 'register_routes' ) );

		Debug::log( 'Endpoints initialized and registered with rest_api_init', 'profile' );

		self::$initialized = true;
	}

	/**
	 * Register profile endpoints.
	 *
	 * Registers all REST API endpoints for profile management:
	 * - Test endpoint for debugging (when WP_DEBUG is enabled)
	 * - Main profile endpoints for CRUD operations
	 * - User data endpoints
	 * - Combined data endpoint
	 * - Basic data endpoint
	 *
	 * @return void
	 */
	public static function register_routes() {
		Debug::log(
			sprintf( 'Registering REST routes [namespace=%s, route=%s]', self::NAMESPACE, self::ROUTE ),
			'profile'
		);

		// Public test endpoint for debugging
		register_rest_route(
			self::NAMESPACE,
			'/' . self::ROUTE . '/public-test',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => function () {
					return rest_ensure_response(
						array(
							'success'   => true,
							'message'   => 'Profile API public test endpoint is working',
							'timestamp' => current_time( 'mysql' ),
						)
					);
				},
				'permission_callback' => '__return_true',  // Allow public access
			)
		);

		// Test endpoint for debugging (only when WP_DEBUG is enabled)
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			Debug::log( 'Registering debug test endpoint', 'profile' );
			register_rest_route(
				self::NAMESPACE,
				'/' . self::ROUTE . '/test',
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => function () {
						$user_id      = get_current_user_id();
						$raw_meta     = get_user_meta( $user_id );
						$profile_data = get_user_meta( $user_id, self::META_KEY, true );

						return rest_ensure_response(
							array(
								'status'    => 'ok',
								'message'   => 'Profile API is working',
								'timestamp' => current_time( 'mysql' ),
								'debug'     => array(
									'user_id'      => $user_id,
									'meta_key'     => self::META_KEY,
									'profile_data' => $profile_data,
									'all_meta'     => $raw_meta,
								),
							)
						);
					},
					'permission_callback' => array( self::class, 'check_auth' ),
				)
			);
		}

		// Main profile endpoints
		Debug::log( 'Registering main profile endpoints', 'profile' );
		register_rest_route(
			self::NAMESPACE,
			'/' . self::ROUTE,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( self::class, 'get_profile' ),
					'permission_callback' => array( self::class, 'check_auth' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( self::class, 'update_profile' ),
					'permission_callback' => array( self::class, 'check_auth' ),
				),
			)
		);

		Debug::log( 'REST routes registration complete', 'profile' );
	}

	/**
	 * Check if user is authenticated.
	 *
	 * Verifies that the current user is logged in and has permission
	 * to access the profile endpoints.
	 *
	 * @return bool True if user is authenticated, false otherwise.
	 */
	public static function check_auth() {
		$user_id = get_current_user_id();

		if ( ! is_user_logged_in() ) {
			Debug::log(
				sprintf( 'Unauthorized access attempt [user_id=%d]', $user_id ),
				'profile'
			);
			return false;
		}

		Debug::log(
			sprintf( 'Access granted [user_id=%d]', $user_id ),
			'profile'
		);
		return true;
	}

	/**
	 * Get profile data for the current user.
	 *
	 * @return WP_REST_Response|WP_Error Response object on success, or error object on failure.
	 */
	public static function get_profile() {
		$user_id = get_current_user_id();

		if ( ! $user_id ) {
			Debug::log( 'Profile fetch failed: no user found', 'profile' );
			return new WP_Error(
				'no_user',
				'User not found',
				array( 'status' => 404 )
			);
		}

		Debug::log( sprintf( 'Fetching profile [user_id=%d]', $user_id ), 'profile' );

		try {
			$profile_data = self::get_profile_data( $user_id );
			Debug::log(
				sprintf(
					'Profile data retrieved [user_id=%d, data_size=%d]',
					$user_id,
					count( $profile_data )
				),
				'profile'
			);

			// Ensure age is properly cast to integer
			if ( isset( $profile_data['age'] ) ) {
				$profile_data['age'] = absint( $profile_data['age'] );
			}

			// Get user data to ensure consistent response format
			$user = get_userdata( $user_id );
			$meta = get_user_meta( $user_id );

			// Merge with basic user data
			$response = array_merge(
				$profile_data,
				array(
					'id'          => $user_id,
					'name'        => $user->display_name,
					'username'    => $user->user_login,
					'email'       => $user->user_email,
					'roles'       => $user->roles,
					'firstName'   => $meta['first_name'][0] ?? '',
					'lastName'    => $meta['last_name'][0] ?? '',
					'displayName' => $user->display_name,
				)
			);

			return rest_ensure_response(
				array(
					'success' => true,
					'data'    => array(
						'profile' => $response,
					),
				)
			);
		} catch ( \Exception $e ) {
			Debug::log(
				sprintf(
					'Profile fetch failed: %s [user_id=%d]',
					$e->getMessage(),
					$user_id
				),
				'profile'
			);
			return new WP_Error(
				'profile_fetch_error',
				'Failed to fetch profile data',
				array( 'status' => 500 )
			);
		}
	}

	/**
	 * Update profile data for the current user.
	 *
	 * @param WP_REST_Request $request The request object containing the profile data to update.
	 * @return WP_REST_Response|WP_Error Response object on success, or error object on failure.
	 */
	public static function update_profile( WP_REST_Request $request ) {
		$user_id = get_current_user_id();
		$data    = $request->get_json_params();

		Debug::log(
			sprintf( 'Updating profile [user_id=%d]', $user_id ),
			'profile'
		);

		if ( empty( $data ) ) {
			Debug::log(
				sprintf( 'Profile update failed: no data provided [user_id=%d]', $user_id ),
				'profile'
			);
			return new WP_Error(
				'invalid_params',
				'No profile data provided',
				array( 'status' => 400 )
			);
		}

		try {
			// Convert age to integer if provided
			if ( isset( $data['age'] ) ) {
				$original_age = $data['age'];
				$data['age']  = absint( $data['age'] );
				Debug::log(
					sprintf(
						'Converting age [user_id=%d, original=%s, converted=%d]',
						$user_id,
						$original_age,
						$data['age']
					),
					'profile'
				);
			}

			// Validate profile data
			$validation = self::validate_profile_data( $data );
			if ( is_wp_error( $validation ) ) {
				Debug::log(
					sprintf(
						'Profile validation failed [user_id=%d, errors=%s]',
						$user_id,
						wp_json_encode( $validation->get_error_data() )
					),
					'profile'
				);
				return $validation;
			}
			Debug::log(
				sprintf( 'Profile validation passed [user_id=%d]', $user_id ),
				'profile'
			);

			// Get and merge current data
			$current_data = self::get_profile_data( $user_id );
			$updated_data = array_merge( $current_data, $data );
			Debug::log(
				sprintf(
					'Merging profile data [user_id=%d, fields=%d]',
					$user_id,
					count( $updated_data )
				),
				'profile'
			);

			// Update user meta
			$update_success = update_user_meta( $user_id, self::META_KEY, $updated_data );
			if ( $update_success === false ) {
				Debug::log(
					sprintf( 'Profile update failed: meta update failed [user_id=%d]', $user_id ),
					'profile'
				);
				return new WP_Error(
					'update_failed',
					'Failed to update profile',
					array( 'status' => 500 )
				);
			}

			// Get user data for response
			$user = get_userdata( $user_id );
			$meta = get_user_meta( $user_id );

			// Merge with basic user data
			$response = array_merge(
				$updated_data,
				array(
					'id'          => $user_id,
					'name'        => $user->display_name,
					'username'    => $user->user_login,
					'email'       => $user->user_email,
					'roles'       => $user->roles,
					'firstName'   => $meta['first_name'][0] ?? '',
					'lastName'    => $meta['last_name'][0] ?? '',
					'displayName' => $user->display_name,
				)
			);

			Debug::log(
				sprintf( 'Profile updated successfully [user_id=%d]', $user_id ),
				'profile'
			);

			return rest_ensure_response(
				array(
					'success' => true,
					'data'    => array(
						'profile' => $response,
					),
				)
			);
		} catch ( \Exception $e ) {
			Debug::log(
				sprintf(
					'Profile update failed: %s [user_id=%d]',
					$e->getMessage(),
					$user_id
				),
				'profile'
			);
			return new WP_Error(
				'profile_update_error',
				'Failed to update profile',
				array( 'status' => 500 )
			);
		}
	}

	/**
	 * Get profile data for a user.
	 *
	 * @param int $user_id The user ID to get profile data for.
	 * @return array The profile data.
	 * @throws \Exception If there is an error getting the profile data.
	 */
	private static function get_profile_data( $user_id ) {
		try {
			$profile_data = get_user_meta( $user_id, self::PROFILE_META_KEY, true );

			if ( ! is_array( $profile_data ) ) {
				Debug::log(
					sprintf(
						'Profile data is not an array [user_id=%d, type=%s]',
						$user_id,
						gettype( $profile_data )
					),
					'profile'
				);
				return array();
			}

			Debug::log(
				sprintf(
					'Profile data retrieved successfully [user_id=%d, fields=%d]',
					$user_id,
					count( $profile_data )
				),
				'profile'
			);

			return $profile_data;
		} catch ( \Exception $e ) {
			Debug::log(
				sprintf(
					'Profile data fetch failed: %s [user_id=%d]',
					$e->getMessage(),
					$user_id
				),
				'profile'
			);
			throw $e;
		}
	}

	/**
	 * Validate profile data before saving.
	 *
	 * @param array $data The profile data to validate.
	 * @return true|WP_Error True if validation passes, WP_Error if validation fails.
	 */
	private static function validate_profile_data( $data ) {
		if ( ! is_array( $data ) ) {
			return new WP_Error(
				'invalid_data_format',
				'Profile data must be an array',
				array( 'status' => 400 )
			);
		}

		$errors = array();

		// Define allowed values for various fields
		$allowed_activity_levels = array( 'sedentary', 'light', 'moderate', 'very_active', 'extra_active' );
		$allowed_genders         = array( 'male', 'female', 'other', 'prefer_not_to_say', '' );

		// Validate core user fields
		if ( isset( $data['email'] ) && ! is_email( $data['email'] ) ) {
			$errors['email'] = 'Invalid email address';
		}

		// Validate name fields
		if ( isset( $data['firstName'] ) && empty( trim( $data['firstName'] ) ) ) {
			$errors['firstName'] = 'First name cannot be empty';
		}
		if ( isset( $data['lastName'] ) && empty( trim( $data['lastName'] ) ) ) {
			$errors['lastName'] = 'Last name cannot be empty';
		}

		// Validate numeric fields
		if ( isset( $data['age'] ) ) {
			$age = absint( $data['age'] );
			if ( $age < 13 || $age > 120 ) {
				$errors['age'] = 'Age must be between 13 and 120';
			}
		}

		// Validate gender field
		if ( isset( $data['gender'] ) && ! in_array( $data['gender'], $allowed_genders, true ) ) {
			$errors['gender'] = sprintf(
				'Invalid gender value. Allowed values: %s',
				implode( ', ', $allowed_genders )
			);
		}

		// Validate phone number if present
		if ( isset( $data['phoneNumber'] ) && ! empty( $data['phoneNumber'] ) ) {
			if ( ! preg_match( '/^[+]?[0-9\s-()]{10,20}$/', $data['phoneNumber'] ) ) {
				$errors['phoneNumber'] = 'Invalid phone number format';
			}
		}

		// Validate emergency contact fields
		if ( isset( $data['emergencyContactName'] ) && empty( trim( $data['emergencyContactName'] ) ) ) {
			$errors['emergencyContactName'] = 'Emergency contact name cannot be empty';
		}
		if ( isset( $data['emergencyContactPhone'] ) ) {
			if ( ! preg_match( '/^[+]?[0-9\s-()]{10,20}$/', $data['emergencyContactPhone'] ) ) {
				$errors['emergencyContactPhone'] = 'Invalid emergency contact phone number';
			}
		}

		// Validate activity level
		if ( isset( $data['activityLevel'] ) && ! in_array( $data['activityLevel'], $allowed_activity_levels, true ) ) {
			$errors['activityLevel'] = sprintf(
				'Invalid activity level. Allowed values: %s',
				implode( ', ', $allowed_activity_levels )
			);
		}

		// Validate array fields
		$array_fields = array( 'medicalConditions', 'exerciseLimitations', 'injuries', 'medications' );
		foreach ( $array_fields as $field ) {
			if ( isset( $data[ $field ] ) ) {
				if ( ! is_array( $data[ $field ] ) ) {
					$errors[ $field ] = ucfirst( $field ) . ' must be an array';
				} else {
					// Validate each item in the array
					foreach ( $data[ $field ] as $index => $item ) {
						if ( $field === 'injuries' ) {
							if ( ! isset( $item['name'], $item['description'], $item['date'], $item['status'] ) ) {
								$errors[ $field . '_' . $index ] = 'Each injury must have name, description, date, and status';
							}
						} elseif ( ! is_string( $item ) || empty( trim( $item ) ) ) {
							$errors[ $field . '_' . $index ] = 'Each ' . rtrim( $field, 's' ) . ' must be a non-empty string';
						}
					}
				}
			}
		}

		// Return validation errors if any found
		if ( ! empty( $errors ) ) {
			return new WP_Error(
				'validation_failed',
				'Profile data validation failed',
				array(
					'status' => 400,
					'errors' => $errors,
				)
			);
		}

		return true;
	}

	/**
	 * Update user data for the current user.
	 *
	 * Updates basic user information in WordPress core for the currently
	 * logged-in user.
	 *
	 * @param WP_REST_Request $request The request object containing the user data to update.
	 * @return WP_REST_Response|WP_Error Response object on success, or error object on failure.
	 */
	public static function update_user_data( WP_REST_Request $request ) {
		$user_id = get_current_user_id();
		$data    = $request->get_json_params();

		Debug::log(
			sprintf( 'Updating user data [user_id=%d]', $user_id ),
			'profile'
		);

		if ( empty( $data ) ) {
			Debug::log(
				sprintf( 'User data update failed: no data provided [user_id=%d]', $user_id ),
				'profile'
			);
			return new WP_Error(
				'invalid_params',
				'No user data provided',
				array( 'status' => 400 )
			);
		}

		try {
			$user = get_userdata( $user_id );
			if ( ! $user ) {
				Debug::log(
					sprintf( 'User data update failed: user not found [user_id=%d]', $user_id ),
					'profile'
				);
				return new WP_Error(
					'user_not_found',
					'User not found',
					array( 'status' => 404 )
				);
			}

			$updateable_fields = array(
				'first_name'   => 'firstName',
				'last_name'    => 'lastName',
				'display_name' => 'displayName',
				'user_email'   => 'email',
			);

			Debug::log(
				sprintf(
					'Validating user data [user_id=%d, fields=%s]',
					$user_id,
					implode( ',', array_keys( $data ) )
				),
				'profile'
			);

			$user_data      = array( 'ID' => $user_id );
			$updated_fields = array();
			foreach ( $updateable_fields as $wp_field => $request_field ) {
				if ( isset( $data[ $request_field ] ) ) {
					$user_data[ $wp_field ] = sanitize_text_field( $data[ $request_field ] );
					$updated_fields[]       = $wp_field;
				}
			}

			if ( count( $user_data ) === 1 ) {
				Debug::log(
					sprintf( 'User data update failed: no valid fields [user_id=%d]', $user_id ),
					'profile'
				);
				return new WP_Error(
					'invalid_params',
					'No valid fields to update',
					array( 'status' => 400 )
				);
			}

			Debug::log(
				sprintf(
					'Updating user fields [user_id=%d, fields=%s]',
					$user_id,
					implode( ',', $updated_fields )
				),
				'profile'
			);

			$result = wp_update_user( $user_data );
			if ( is_wp_error( $result ) ) {
				Debug::log(
					sprintf(
						'User update failed: %s [user_id=%d]',
						$result->get_error_message(),
						$user_id
					),
					'profile'
				);
				return $result;
			}

			// Get updated user data
			$updated_user = get_userdata( $user_id );
			$meta         = get_user_meta( $user_id );
			$response     = array(
				'id'          => $user_id,
				'name'        => $updated_user->display_name,
				'username'    => $updated_user->user_login,
				'email'       => $updated_user->user_email,
				'roles'       => $updated_user->roles,
				'firstName'   => $meta['first_name'][0] ?? '',
				'lastName'    => $meta['last_name'][0] ?? '',
				'displayName' => $updated_user->display_name,
			);

			Debug::log(
				sprintf(
					'User data update complete [user_id=%d, updated_fields=%d]',
					$user_id,
					count( $updated_fields )
				),
				'profile'
			);

			return rest_ensure_response(
				array(
					'success' => true,
					'data'    => array(
						'profile' => $response,
					),
				)
			);
		} catch ( \Exception $e ) {
			Debug::log(
				sprintf(
					'User data update failed: %s [user_id=%d]',
					$e->getMessage(),
					$user_id
				),
				'profile'
			);
			return new WP_Error(
				'update_error',
				'Failed to update user data',
				array( 'status' => 500 )
			);
		}
	}

	/**
	 * Register remaining routes.
	 *
	 * @return void
	 */
	public function register_remaining_routes(): void {
		// Main profile endpoints
		register_rest_route(
			self::NAMESPACE,
			'/' . self::ROUTE,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( self::class, 'get_profile' ),
					'permission_callback' => array( self::class, 'check_auth' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( self::class, 'update_profile' ),
					'permission_callback' => array( self::class, 'check_auth' ),
				),
			)
		);

		// User data update endpoint
		register_rest_route(
			self::NAMESPACE,
			'/' . self::ROUTE . '/user',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( self::class, 'update_user_data' ),
					'permission_callback' => array( self::class, 'check_auth' ),
				),
			)
		);
	}
}
