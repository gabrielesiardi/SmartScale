import React, { useEffect, useState } from "react";

const WeightDisplay = ({ name, endpoint }) => {
  const [weight, setWeight] = useState(null);

  useEffect(() => {
    const fetchWeight = async () => {
      try {
        console.log("Fetching from", endpoint);
        const res = await fetch(endpoint);
        const data = await res.json();
        console.log("Received weight:", data.weight);
        setWeight(data.weight);
      } catch (err) {
        console.error("Error fetching weight:", err);
        setWeight(null);
      }
    };

    fetchWeight(); // fetch immediately
    const interval = setInterval(fetchWeight, 1000); // then every 1s
    return () => clearInterval(interval);
  }, [endpoint]);

  return (
    <div className="bg-white shadow rounded-2xl p-6">
      <h2
  className="font-semibold mb-1 text-center truncate text-[clamp(1rem,2vw,150rem)]"
  style={{ overflowWrap: "normal", wordBreak: "keep-all" }}
  title={name}
>
  {name}
</h2>
<p className="text-gray-800 leading-none mt-1">
  {weight !== null ? (
    <span className="text-14xl font-bold">
      {weight}
      <span className="text-9xl font-semibold ml-1">kg</span>
    </span>
  ) : (
    <span className="text-4xl">Loading...</span>
  )}
</p>

    </div>
  );
};

export default WeightDisplay;