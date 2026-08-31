export function createBoneWiggles(root, specs) {
	const wiggles = [];
	for (const spec of specs) {
		const bone = root.getObjectByName(spec.name);
		if (!bone) continue;
		wiggles.push({
			bone,
			axis: spec.axis,
			amplitude: spec.amplitude,
			speed: spec.speed,
			phase: spec.phase || 0,
			base: bone.rotation[spec.axis],
		});
	}
	return wiggles;
}

export function updateBoneWiggles(wiggles, elapsedSeconds) {
	for (const wiggle of wiggles) {
		wiggle.bone.rotation[wiggle.axis] =
			wiggle.base +
			Math.sin(elapsedSeconds * wiggle.speed + wiggle.phase) * wiggle.amplitude;
	}
}
