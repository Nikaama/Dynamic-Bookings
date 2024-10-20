
  // Submit Check-in Form
document.getElementById('checkinForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData.entries());

  console.log('Submitting form data:', data); // Debug log

  fetch('/checkin', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
  })
  .then(response => {
      if (!response.ok) throw new Error('Failed to submit check-in');
      return response.json();
  })
  .then(responseData => {
      console.log('Check-in successful:', responseData); // Debug log
      alert('Check-in successful!');

      // Mark the booking as checked_in in the booking table
      return fetch(`/booking/${data.booking_id}/status`, {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'checked_in' }),
      });
  })
  .then(updateResponse => {
      if (!updateResponse.ok) throw new Error('Failed to update booking status');
      return updateResponse.json();
  })
  .then(() => {
      console.log('Booking status updated to checked_in.');
      
      // Clear the form and hide it
      document.getElementById('checkinForm').reset();
      document.getElementById('checkinForm').classList.add('hidden');
  })
  .catch(error => {
      console.error('Error:', error); // Debug log
      alert('Check-in submission or status update failed.');
  });
});