import { useState, useEffect } from "react";

export default function AddLineItemForm() {

  const [authHeader, setAuthHeader] = useState(null);

  useEffect(() => {
    fetch("/app/site/hosting/scriptlet.nl?script=4330&deploy=1")
      .then(res => res.json())
      .then(data => setAuthHeader(data.header));
  }, []);

  const [recordId, setRecordId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [rate, setRate] = useState("");

  const addLine = async () => {
    const response = await fetch(
      "/app/site/hosting/restlet.nl?script=4329&deploy=1",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader
        },
        body: JSON.stringify({
          recordId,
          itemId,
          quantity,
          rate
        })
      }
    );

    const data = await response.json();

    if (data.success) {
      alert("Updated Sales Order: " + data.updatedRecordId);
    } else {
      alert("ERROR: " + data.message);
    }
  };

  return (
    <div>
      <h3>Add Line Item</h3>

      <input value={recordId} placeholder="Sales Order ID" onChange={e => setRecordId(e.target.value)} />
      <input value={itemId} placeholder="Item ID" onChange={e => setItemId(e.target.value)} />
      <input value={quantity} placeholder="Quantity" onChange={e => setQuantity(e.target.value)} />
      <input value={rate} placeholder="Rate" onChange={e => setRate(e.target.value)} />

      <button disabled={!authHeader} onClick={addLine}>
        {authHeader ? "Add Line Item" : "Loading Auth Token..."}
      </button>
    </div>
  );
}
