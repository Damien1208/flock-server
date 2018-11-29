import {
  users,
  voters,
  creator,
  buildSuggestionsObj,
  findUserOrCreate
} from '../resolver-helpers';
import { AuthenticationError } from 'apollo-server';

export default {
  Query: {
    trip: (_, { id }, { Trip }) => Trip.findOne({ _id: id }),
    allTrips: (_, __, { Trip }) => Trip.find()
  },

  Mutation: {
    createTrip: async (_, { trip }, { Trip, User, user: { email } }) => {
      const user = await User.findOne({ email });
      if (!user) throw new AuthenticationError();
      const {
        destination = { isDictated: false },
        budget = { isDictated: false },
        timeFrame = { isDictated: false },
        participants
      } = trip;

      trip.participants = await findUserOrCreate(participants, User);
      trip.participants = [user._id, ...trip.participants];
      destination.suggestions = buildSuggestionsObj(destination, user._id);
      budget.suggestions = buildSuggestionsObj(budget, user._id);
      timeFrame.suggestions = buildSuggestionsObj(timeFrame, user._id);
      trip['creator'] = user._id;
      return Trip.create({
        ...trip,
        destination,
        budget,
        timeFrame
      });
    },
    addParticipant: async (_, { tripID, participants }, { Trip, User }) => {
      participants = await findUserOrCreate(participants, User);
      const participant = [
        { _id: tripID },
        {
          $addToSet: {
            participants: { $each: participants }
          }
        },
        { new: true }
      ];
      return Trip.findOneAndUpdate(...participant);
    },
    addDestination: (_, { tripID, destination }, { Trip }) => {
      let suggestion = destination.suggestions;
      let addDestinationSuggestion = [
        { _id: tripID },
        {
          $addToSet: {
            'destination.suggestions': { $each: suggestion }
          }
        },
        { new: true }
      ];
      return Trip.findOneAndUpdate(...addDestinationSuggestion);
    },
    addBudget: (_, { tripID, budget }, { Trip }) => {
      let suggestion = budget.suggestions;
      let addBudgetSuggestion = [
        { _id: tripID },
        {
          $addToSet: {
            'budget.suggestions': { $each: suggestion }
          }
        },
        { new: true }
      ];
      return Trip.findOneAndUpdate(...addBudgetSuggestion);
    },
    addTimeFrame: (_, { tripID, timeFrame }, { Trip }) => {
      let suggestion = timeFrame.suggestions;
      console.log(suggestion);
      let addTimeFrameSuggestion = [
        { _id: tripID },
        {
          $addToSet: {
            'timeFrame.suggestions': { $each: suggestion }
          }
        },
        { new: true }
      ];
      return Trip.findOneAndUpdate(...addTimeFrameSuggestion);
    },
    removeBudget: (_, { tripID, budget }, { Trip }) => {
      let suppression = budget.suggestions;
      console.log(suppression);
      let removeBudgetSuggestion = [
        { _id: tripID },
        {
          $pull: suppression
        },
        { new: true }
      ];
      return Trip.findOneAndUpdate({ ...removeBudgetSuggestion });
    }
  },

  Trip: {
    participants: ({ participants }, _, { User }) => users(participants, User),
    creator
  },
  DestinationObject: {
    chosenDestination: ({ chosenDestination, suggestions }) =>
      suggestions.find(
        destination => String(chosenDestination) === String(destination._id)
      ) || null
  },
  Destination: {
    voters,
    creator
  },
  BudgetObject: {
    chosenBudget: ({ chosenBudget, suggestions }) =>
      chosenBudget || suggestions.find(budget => chosenBudget === budget._id)
  },
  Budget: {
    voters,
    creator
  },
  TimeFrameObject: {
    chosenTimeFrame: ({ chosenTimeFrame, suggestions }) =>
      chosenTimeFrame ||
      suggestions.find(timeFrame => chosenTimeFrame === timeFrame._id)
  },
  TimeFrame: {
    voters,
    creator
  }
};
