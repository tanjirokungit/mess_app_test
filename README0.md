REPORT SHEET header --> name, totalMeal, totalDays, pay, status
NOTICE SHEET header --> date, title, text

//code for both sheet
/**
 * Google Apps Script (GAS) Web App to serve data from the active Google Sheet
 * as a JSON endpoint.
 *
 * INSTRUCTIONS:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions -> Apps Script.
 * 3. Replace the contents of the Code.gs file with this script.
 * 4. Save the script (Ctrl+S or File -> Save).
 * 5. Deploy the script: Click 'Deploy' -> 'New deployment'.
 * 6. Under 'Select type', choose 'Web app'.
 * 7. Set 'Execute as' to 'Me'.
 * 8. Set 'Who has access' to 'Anyone'.
 * 9. Click 'Deploy' and copy the resulting Web App URL.
 * 10. Use this URL in the updated HTML file's input field.
 */
function doGet(e) {
  // Use the active spreadsheet (the sheet the script is bound to)
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get the first sheet (Sheet1) or specify by name: ss.getSheetByName("MyDataSheet")
  const sheet = ss.getSheets()[0];

  // Get all data, assuming data starts at A1
  const range = sheet.getDataRange();
  const values = range.getValues(); // values in 2d array
  // [[Date, Title, Book], [--time--, Mom, Hi mom], [--time--, Dad, Hi dad]]

  if (values.length === 0) {
    // Return an error or empty array if no data is found
    return ContentService.createTextOutput(
      JSON.stringify({ error: "Sheet is empty or no data found." })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  /* ==What above code does?==
    --- is a live JavaScript Array of JavaScript Objects 
    (created in your loop).

    JSON.stringify(---) converts that live array 
    structure into one long, continuous text string 
    (the JSON string).

    ContentService.createTextOutput(...) wraps that string 
    in a format Google Apps Script can use to send an HTTP 
    response.

    .setMimeType(...) tells the receiving application 
    (your HTML/browser) that the string it's receiving 
    should be interpreted as JSON data.

    This process ensures your front-end code receives valid, 
    structured data that it can then parse back into a 
    JavaScript array using response.json() (which automatically 
    uses JSON.parse())
  */

  // The first row is the header
  const headers = values[0].map((header) => String(header).trim());
  // == Above code's return
  /*
   * headers = ['Date', 'Title', 'Book']
   */

  // Array to hold the objects
  const data = [];

  // Iterate over the rest of the rows (data rows)
  for (let i = 1; i < values.length; i++) {
    const row = {};
    const currentRow = values[i];
    // [--time--,Mom,Hi mom]
    // [... , ... , ...]          ...

    // Convert the row array into a JSON object using headers as keys
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = currentRow[j]; // Dynamic Key/Prop Assignment
      // row['Date'] = '--time--'  //// row[]  is an Obj  //// Result below:
      // {'Date' : '--time--'}

      // eventually: { Date: '--time--', Title: 'Mom', Book: 'Hi mom' }
    }
    data.push(row);
  }
  //
  /* === Result of the above code (exmp.) ===
    // Final content of the 'data' array before JSON.stringify()

    data =
    [
      {
        "Date": "Fri Nov 11 00:00:00 GMT+06:00 2011",
        "Title": "Mom",
        "Book": "Hi mom"
      },
      {
        "Date": "Sat Feb 02 00:00:00 GMT+06:00 2002",
        "Title": "Dad",
        "Book": "Hi dad"
      }
    ]
  */

  // Create the JSON response
  const jsonOutput = JSON.stringify(data);
  // "[{"Date":"Fri Nov 11 00:00:00 GMT+06:00 2011","Title":"Mom","Book":"Hi mom"},{"Date":"Sat Feb 02 00:00:00 GMT+06:00 2002","Title":"Dad","Book":"Hi dad"}]"
  // Return the content, setting the MIME type to JSON
  // This is required for external HTML/JS to read the response.
  return ContentService.createTextOutput(jsonOutput).setMimeType(
    ContentService.MimeType.JSON
  );
}
/******************************************************* 
// The Resulting JSON Structure
[
  {
    "Name": "Alice",
    "Age": 30,
    "City": "New York"
  },
  {
    "Name": "Bob",
    "Age": 25,
    "City": "London"
  },
  {
    "Name": "Carol",
    "Age": 42,
    "City": "Tokyo"
  }
]

### Key Points:

* **Array (`[]`):** The entire output is wrapped in an array, which is why your front-end code uses `data.forEach()` and checks `Array.isArray()`.
* **Objects (`{}`):** Each row of the spreadsheet is represented by a JavaScript object.
* **Headers as Keys:** The values from the **first row** of your sheet (`Name`, `Age`, `City`) become the **keys** (property names) for every object.
* **Cells as Values:** The remaining cell values become the **values** associated with those keys.

This standardized structure is clean, easy for JavaScript to parse (`JSON.parse()`), and perfect for iterating through and rendering into an HTML table.
**************************************************** */
