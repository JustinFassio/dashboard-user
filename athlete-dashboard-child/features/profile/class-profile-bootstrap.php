<?php
/**
 * Profile Feature Bootstrap.
 *
 * @package AthleteDashboard\Features\Profile
 */

namespace AthleteDashboard\Features\Profile;

use AthleteDashboard\Core\Events;
use AthleteDashboard\Core\Container;
use AthleteDashboard\Features\Profile\API\Profile_Endpoints;
use AthleteDashboard\Features\Profile\API\Response_Factory;
use AthleteDashboard\Features\Profile\Events\Listeners\User_Updated_Listener;
use AthleteDashboard\Features\Profile\Services\Profile_Service;
use AthleteDashboard\Features\User\Events\User_Updated;
use AthleteDashboard\Features\Profile\Admin\Profile_Admin;

/**
 * Bootstrap class for the Profile feature.
 */
class Profile_Bootstrap {
	/**
	 * Register event listeners for the Profile feature.
	 *
	 * @param Container $container Service container instance.
	 */
	public function register_events( Container $container ): void {
		// Register the User Updated listener
		Events::listen(
			User_Updated::class,
			function ( User_Updated $event ) use ( $container ): void {
				$listener = new User_Updated_Listener(
					$container->get( Profile_Service::class )
				);
				$listener->handle( $event );
			}
		);
	}

	/**
	 * Register service bindings.
	 *
	 * @param Container $container Service container instance.
	 */
	public function register_services( Container $container ): void {
		// Bind the Profile Repository
		$container->singleton(
			Repository\Profile_Repository::class,
			fn() => new Repository\Profile_Repository()
		);

		// Bind the Profile Validator
		$container->singleton(
			Validation\Profile_Validator::class,
			fn() => new Validation\Profile_Validator()
		);

		// Bind the Response Factory
		$container->singleton(
			Response_Factory::class,
			fn() => new Response_Factory()
		);

		// Bind the Profile Service
		$container->singleton(
			Services\Profile_Service::class,
			fn( Container $container ) => new Services\Profile_Service(
				$container->get( Repository\Profile_Repository::class ),
				$container->get( Validation\Profile_Validator::class )
			)
		);

		// Bind the Profile Endpoints
		$container->singleton(
			Profile_Endpoints::class,
			fn( Container $container ) => new Profile_Endpoints(
				$container->get( Services\Profile_Service::class ),
				$container->get( Validation\Profile_Validator::class ),
				$container->get( Response_Factory::class )
			)
		);
	}

	/**
	 * Register REST API routes.
	 *
	 * @param Container $container Service container instance.
	 */
	public function register_routes( Container $container ): void {
		add_action(
			'rest_api_init',
			function () use ( $container ) {
				$endpoints = $container->get( Profile_Endpoints::class );
				$endpoints->init();
			}
		);
	}

	/**
	 * Run migrations for database setup.
	 */
	private function run_migrations(): void {
		error_log( 'Profile_Bootstrap: Running migrations' );

		$physical_migration = new Physical_Data_Migration();
		$result = $physical_migration->up();

		if ( is_wp_error( $result ) ) {
			error_log( 'Profile_Bootstrap: Migration failed - ' . $result->get_error_message() );
		} else {
			error_log( 'Profile_Bootstrap: Migration completed successfully' );
		}
	}

	/**
	 * Initialize the feature.
	 */
	public function init(): void {
		error_log( 'Profile_Bootstrap: Initializing' );
		
		// Run migrations on after_switch_theme hook
		add_action('after_switch_theme', array($this, 'run_migrations'));
		
		$this->register_events();
		$this->register_routes();
	}

	/**
	 * Bootstrap the feature.
	 *
	 * @param Container $container Service container instance.
	 */
	public function bootstrap( Container $container ): void {
		$this->register_services( $container );
		$this->register_events( $container );
		$this->register_routes( $container );

		// Initialize admin functionality
		if (is_admin()) {
			$profile_admin = new Profile_Admin();
			$profile_admin->init();
		}
	}
}
