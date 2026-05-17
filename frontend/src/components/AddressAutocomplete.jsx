import React from 'react';
import PlacesAutocomplete, {
  geocodeByAddress,
  getLatLng,
} from 'react-places-autocomplete';
import './AddressAutocomplete.css';

const AddressAutocomplete = ({ value, onChange, onSelect, placeholder = "Ingresa una dirección" }) => {
  const handleSelect = async (address) => {
    try {
      const results = await geocodeByAddress(address);
      const latLng = await getLatLng(results[0]);

      onSelect({
        address,
        coordinates: latLng,
        placeId: results[0].place_id
      });
    } catch (error) {
      console.error('Error al geocodificar la dirección:', error);
    }
  };

  return (
    <PlacesAutocomplete
      value={value}
      onChange={onChange}
      onSelect={handleSelect}
    >
      {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
        <div className="address-autocomplete">
          <input
            {...getInputProps({
              placeholder: placeholder,
              className: 'location-search-input form-control',
            })}
          />
          <div className="autocomplete-dropdown-container">
            {loading && <div className="suggestion-item">Cargando...</div>}
            {suggestions.map((suggestion, index) => {
              const className = suggestion.active
                ? 'suggestion-item--active'
                : 'suggestion-item';
              const style = suggestion.active
                ? { backgroundColor: '#fafafa', cursor: 'pointer' }
                : { backgroundColor: '#ffffff', cursor: 'pointer' };
              return (
                <div
                  key={index}
                  {...getSuggestionItemProps(suggestion, {
                    className,
                    style,
                  })}
                >
                  <span>{suggestion.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PlacesAutocomplete>
  );
};

export default AddressAutocomplete;