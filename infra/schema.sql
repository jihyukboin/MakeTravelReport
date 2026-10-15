CREATE TABLE IF NOT EXISTS regions (
 code VARCHAR(5) PRIMARY KEY, name VARCHAR(100)
);
CREATE TABLE IF NOT EXISTS districts (
 region_code VARCHAR(5) NOT NULL, code VARCHAR(5) NOT NULL, name VARCHAR(100),
 PRIMARY KEY(region_code, code), FOREIGN KEY(region_code) REFERENCES regions(code)
);
CREATE TABLE IF NOT EXISTS categories (
 code VARCHAR(16) PRIMARY KEY, name VARCHAR(200), parent_code VARCHAR(16), level INTEGER NOT NULL,
 FOREIGN KEY(parent_code) REFERENCES categories(code)
);
CREATE TABLE IF NOT EXISTS content_types (
 id VARCHAR(4) PRIMARY KEY, name VARCHAR(100) NOT NULL
);
CREATE TABLE IF NOT EXISTS attractions (
 content_id VARCHAR(32) PRIMARY KEY, content_type_id VARCHAR(4) NOT NULL, title VARCHAR(1000) NOT NULL,
 region_code VARCHAR(5), district_code VARCHAR(5), category_code VARCHAR(16),
 address1 TEXT, address2 TEXT, postal_code VARCHAR(10), telephone TEXT,
 longitude DECIMAL(15,10), latitude DECIMAL(15,10), created_at DATETIME, modified_at DATETIME,
 FOREIGN KEY(content_type_id) REFERENCES content_types(id),
 FOREIGN KEY(region_code) REFERENCES regions(code),
 FOREIGN KEY(region_code, district_code) REFERENCES districts(region_code, code),
 FOREIGN KEY(category_code) REFERENCES categories(code)
);
CREATE TABLE IF NOT EXISTS attraction_images (
 content_id VARCHAR(32) PRIMARY KEY, image_url TEXT, thumbnail_url TEXT, copyright_type VARCHAR(20),
 FOREIGN KEY(content_id) REFERENCES attractions(content_id)
);
CREATE TABLE IF NOT EXISTS photos (
 photo_id VARCHAR(32) PRIMARY KEY, title VARCHAR(1000), image_url TEXT, photography_month VARCHAR(7),
 location TEXT, photographer VARCHAR(500), created_at DATETIME, modified_at DATETIME
);
CREATE TABLE IF NOT EXISTS keywords (
 keyword VARCHAR(255) PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS photo_keywords (
 photo_id VARCHAR(32) NOT NULL, keyword VARCHAR(255) NOT NULL,
 PRIMARY KEY(photo_id, keyword), FOREIGN KEY(photo_id) REFERENCES photos(photo_id),
 FOREIGN KEY(keyword) REFERENCES keywords(keyword)
);
CREATE TABLE IF NOT EXISTS charging_operators (
 operator_id VARCHAR(20) PRIMARY KEY, name VARCHAR(500), telephone VARCHAR(200)
);
CREATE TABLE IF NOT EXISTS charging_stations (
 station_id VARCHAR(32) PRIMARY KEY, name VARCHAR(1000), operator_id VARCHAR(20), address TEXT,
 latitude DECIMAL(15,10), longitude DECIMAL(15,10), operating_hours TEXT,
 region_code VARCHAR(5), district_code VARCHAR(5), parking_free INTEGER, restricted INTEGER, restriction_detail TEXT,
 kind VARCHAR(20), kind_detail VARCHAR(20), note TEXT,
 FOREIGN KEY(operator_id) REFERENCES charging_operators(operator_id)
);
CREATE TABLE IF NOT EXISTS chargers (
 station_id VARCHAR(32) NOT NULL, charger_id VARCHAR(20) NOT NULL, charger_type VARCHAR(20),
 output_kw DECIMAL(12,3), method VARCHAR(100), location TEXT, address_detail TEXT,
 deleted INTEGER, deletion_detail TEXT, traffic INTEGER, installation_year INTEGER,
 floor_number VARCHAR(100), floor_type VARCHAR(20), manufacturer VARCHAR(200),
 PRIMARY KEY(station_id, charger_id), FOREIGN KEY(station_id) REFERENCES charging_stations(station_id)
);
CREATE TABLE IF NOT EXISTS charger_status (
 station_id VARCHAR(32) NOT NULL, charger_id VARCHAR(20) NOT NULL, status_code VARCHAR(4),
 updated_at DATETIME, last_started_at DATETIME, last_ended_at DATETIME, current_started_at DATETIME,
 PRIMARY KEY(station_id, charger_id), FOREIGN KEY(station_id, charger_id) REFERENCES chargers(station_id, charger_id)
);
CREATE TABLE IF NOT EXISTS astronomy_locations (
 name VARCHAR(100) PRIMARY KEY, latitude DECIMAL(15,10), longitude DECIMAL(15,10)
);
CREATE TABLE IF NOT EXISTS sun_times (
 location_name VARCHAR(100) NOT NULL, observation_date DATE NOT NULL,
 sunrise TIME, sunset TIME, sun_transit TIME, moonrise TIME, moonset TIME, moon_transit TIME,
 civil_dawn TIME, civil_dusk TIME, nautical_dawn TIME, nautical_dusk TIME, astronomical_dawn TIME, astronomical_dusk TIME,
 PRIMARY KEY(location_name, observation_date), FOREIGN KEY(location_name) REFERENCES astronomy_locations(name)
);
